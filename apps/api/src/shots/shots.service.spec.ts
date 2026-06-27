import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { ShotsService } from './shots.service'
import { PrismaService } from '../prisma/prisma.service'

const mockSeason = { id: 'season-1', isActive: true }
const mockUser = { id: 'user-1' }

const mockShip = {
  id: 'ship-1',
  isSunk: false,
  prize: { id: 'prize-1', name: 'iPhone 15' },
  cells: [
    { id: 'cell-1', row: 0, col: 0 },
    { id: 'cell-2', row: 0, col: 1 },
  ],
}

const mockBalance = { id: 'balance-1', userId: 'user-1', seasonId: 'season-1', available: 3 }

const mockShot = {
  id: 'shot-1',
  userId: 'user-1',
  seasonId: 'season-1',
  row: 0,
  col: 0,
  isHit: true,
  shipId: 'ship-1',
  createdAt: new Date(),
}

const mockTx = {
  shot: { create: jest.fn(), findMany: jest.fn() },
  shotBalance: { upsert: jest.fn(), update: jest.fn() },
  ship: { update: jest.fn() },
  shipCell: { findFirst: jest.fn() },
}

const mockPrisma = {
  season: { findUnique: jest.fn() },
  shot: { findUnique: jest.fn(), findMany: jest.fn() },
  shotBalance: { findUnique: jest.fn() },
  shipCell: { findFirst: jest.fn() },
  $transaction: jest.fn(),
}

describe('ShotsService', () => {
  let service: ShotsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShotsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<ShotsService>(ShotsService)
    jest.clearAllMocks()
  })

  describe('fire', () => {
    beforeEach(() => {
      mockPrisma.season.findUnique.mockResolvedValue(mockSeason)
      mockPrisma.shot.findUnique.mockResolvedValue(null)
      mockPrisma.shotBalance.findUnique.mockResolvedValue(mockBalance)
      mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockTx))
      mockTx.shipCell.findFirst.mockResolvedValue(null)
      mockTx.shot.create.mockResolvedValue({ ...mockShot, isHit: false, shipId: null })
      mockTx.shotBalance.upsert.mockResolvedValue({ ...mockBalance, available: 2 })
      mockTx.shot.findMany.mockResolvedValue([])
    })

    it('регистрирует промах если клетка пустая', async () => {
      const result = await service.fire('season-1', 'user-1', { row: 5, col: 5 })
      expect(result.isHit).toBe(false)
      expect(mockTx.shot.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isHit: false, shipId: null }) }),
      )
    })

    it('регистрирует попадание если клетка занята кораблём', async () => {
      mockTx.shipCell.findFirst.mockResolvedValue({ shipId: 'ship-1' })
      mockTx.shot.create.mockResolvedValue(mockShot)
      mockTx.shot.findMany.mockResolvedValue([{ row: 0, col: 0 }])
      mockTx.ship.update.mockResolvedValue({ ...mockShip, isSunk: false })

      const result = await service.fire('season-1', 'user-1', { row: 0, col: 0 })
      expect(result.isHit).toBe(true)
    })

    it('помечает корабль потопленным если все клетки поражены', async () => {
      mockTx.shipCell.findFirst.mockResolvedValue({ shipId: 'ship-1', ship: mockShip })
      mockTx.shot.create.mockResolvedValue(mockShot)
      // все клетки корабля уже поражены
      mockTx.shot.findMany.mockResolvedValue([{ row: 0, col: 0 }, { row: 0, col: 1 }])
      mockTx.ship.update.mockResolvedValue({ ...mockShip, isSunk: true })

      await service.fire('season-1', 'user-1', { row: 0, col: 0 })

      expect(mockTx.ship.update).toHaveBeenCalledWith({
        where: { id: 'ship-1' },
        data: { isSunk: true },
      })
    })

    it('выбрасывает NotFoundException если сезон не найден', async () => {
      mockPrisma.season.findUnique.mockResolvedValue(null)
      await expect(service.fire('ghost', 'user-1', { row: 0, col: 0 })).rejects.toThrow(NotFoundException)
    })

    it('выбрасывает BadRequestException если сезон не активен', async () => {
      mockPrisma.season.findUnique.mockResolvedValue({ ...mockSeason, isActive: false })
      await expect(service.fire('season-1', 'user-1', { row: 0, col: 0 })).rejects.toThrow(BadRequestException)
    })

    it('выбрасывает BadRequestException если клетка уже была атакована', async () => {
      mockPrisma.shot.findUnique.mockResolvedValue(mockShot)
      await expect(service.fire('season-1', 'user-1', { row: 0, col: 0 })).rejects.toThrow(BadRequestException)
    })

    it('выбрасывает ForbiddenException если нет доступных выстрелов', async () => {
      mockPrisma.shotBalance.findUnique.mockResolvedValue({ ...mockBalance, available: 0 })
      await expect(service.fire('season-1', 'user-1', { row: 0, col: 0 })).rejects.toThrow(ForbiddenException)
    })

    it('выбрасывает ForbiddenException если баланса нет совсем', async () => {
      mockPrisma.shotBalance.findUnique.mockResolvedValue(null)
      await expect(service.fire('season-1', 'user-1', { row: 0, col: 0 })).rejects.toThrow(ForbiddenException)
    })
  })

  describe('findHistory', () => {
    it('возвращает историю выстрелов пользователя', async () => {
      mockPrisma.shot.findMany.mockResolvedValue([mockShot])
      const result = await service.findHistory('season-1', 'user-1')
      expect(result).toEqual([mockShot])
      expect(mockPrisma.shot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { seasonId: 'season-1', userId: 'user-1' } }),
      )
    })
  })
})
