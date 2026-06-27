import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { ShipsService } from './ships.service'
import { PrismaService } from '../prisma/prisma.service'

const mockSeason = { id: 'season-1', isActive: true }
const mockPrize = { id: 'prize-1', seasonId: 'season-1', ship: null }
const mockShip = {
  id: 'ship-1',
  seasonId: 'season-1',
  prizeId: 'prize-1',
  isSunk: false,
  cells: [
    { id: 'cell-1', shipId: 'ship-1', row: 0, col: 0 },
    { id: 'cell-2', shipId: 'ship-1', row: 0, col: 1 },
  ],
  prize: mockPrize,
}

const mockPrisma = {
  season: { findUnique: jest.fn() },
  prize: { findUnique: jest.fn() },
  ship: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  shipCell: { findFirst: jest.fn() },
}

describe('ShipsService', () => {
  let service: ShipsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<ShipsService>(ShipsService)
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('возвращает корабли сезона с клетками и призом', async () => {
      mockPrisma.ship.findMany.mockResolvedValue([mockShip])
      const result = await service.findAll('season-1')
      expect(result).toEqual([mockShip])
      expect(mockPrisma.ship.findMany).toHaveBeenCalledWith({
        where: { seasonId: 'season-1' },
        include: { cells: true, prize: true },
      })
    })
  })

  describe('create', () => {
    const validCells = [{ row: 0, col: 0 }, { row: 0, col: 1 }]

    beforeEach(() => {
      mockPrisma.season.findUnique.mockResolvedValue(mockSeason)
      mockPrisma.prize.findUnique.mockResolvedValue(mockPrize)
      mockPrisma.shipCell.findFirst.mockResolvedValue(null)
      mockPrisma.ship.create.mockResolvedValue(mockShip)
    })

    it('создаёт корабль с клетками', async () => {
      const result = await service.create('season-1', { prizeId: 'prize-1', cells: validCells })
      expect(result).toEqual(mockShip)
      expect(mockPrisma.ship.create).toHaveBeenCalled()
    })

    it('выбрасывает NotFoundException если сезон не найден', async () => {
      mockPrisma.season.findUnique.mockResolvedValue(null)
      await expect(
        service.create('ghost-id', { prizeId: 'prize-1', cells: validCells }),
      ).rejects.toThrow(NotFoundException)
    })

    it('выбрасывает NotFoundException если приз не найден', async () => {
      mockPrisma.prize.findUnique.mockResolvedValue(null)
      await expect(
        service.create('season-1', { prizeId: 'ghost-id', cells: validCells }),
      ).rejects.toThrow(NotFoundException)
    })

    it('выбрасывает BadRequestException если приз из другого сезона', async () => {
      mockPrisma.prize.findUnique.mockResolvedValue({ ...mockPrize, seasonId: 'other-season' })
      await expect(
        service.create('season-1', { prizeId: 'prize-1', cells: validCells }),
      ).rejects.toThrow(BadRequestException)
    })

    it('выбрасывает BadRequestException если приз уже занят', async () => {
      mockPrisma.prize.findUnique.mockResolvedValue({ ...mockPrize, ship: { id: 'ship-99' } })
      await expect(
        service.create('season-1', { prizeId: 'prize-1', cells: validCells }),
      ).rejects.toThrow(BadRequestException)
    })

    it('выбрасывает BadRequestException если клеток больше 4', async () => {
      const tooBig = [
        { row: 0, col: 0 }, { row: 0, col: 1 },
        { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 },
      ]
      await expect(
        service.create('season-1', { prizeId: 'prize-1', cells: tooBig }),
      ).rejects.toThrow(BadRequestException)
    })

    it('выбрасывает BadRequestException если клетки не образуют линию', async () => {
      const diagonal = [{ row: 0, col: 0 }, { row: 1, col: 1 }]
      await expect(
        service.create('season-1', { prizeId: 'prize-1', cells: diagonal }),
      ).rejects.toThrow(BadRequestException)
    })

    it('выбрасывает BadRequestException если клетка выходит за поле', async () => {
      const outOfBounds = [{ row: 0, col: 9 }, { row: 0, col: 10 }]
      await expect(
        service.create('season-1', { prizeId: 'prize-1', cells: outOfBounds }),
      ).rejects.toThrow(BadRequestException)
    })

    it('выбрасывает BadRequestException при пересечении с другим кораблём', async () => {
      mockPrisma.shipCell.findFirst.mockResolvedValue({ id: 'occupied' })
      await expect(
        service.create('season-1', { prizeId: 'prize-1', cells: validCells }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('remove', () => {
    it('удаляет корабль', async () => {
      mockPrisma.ship.findUnique.mockResolvedValue(mockShip)
      mockPrisma.ship.delete.mockResolvedValue(mockShip)
      const result = await service.remove('ship-1')
      expect(result).toEqual(mockShip)
    })

    it('выбрасывает NotFoundException если корабль не найден', async () => {
      mockPrisma.ship.findUnique.mockResolvedValue(null)
      await expect(service.remove('ghost-id')).rejects.toThrow(NotFoundException)
    })

    it('выбрасывает BadRequestException если корабль уже потоплен', async () => {
      mockPrisma.ship.findUnique.mockResolvedValue({ ...mockShip, isSunk: true })
      await expect(service.remove('ship-1')).rejects.toThrow(BadRequestException)
    })
  })
})
