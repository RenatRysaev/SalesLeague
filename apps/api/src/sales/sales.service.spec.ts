import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { SalesService } from './sales.service'
import { PrismaService } from '../prisma/prisma.service'

const mockSeason = { id: 'season-1', isActive: true, amountPerShot: 10000 }
const mockUser = { id: 'user-1', name: 'Иван' }

const mockEntry = {
  id: 'entry-1',
  userId: 'user-1',
  seasonId: 'season-1',
  amount: 30000,
  shots: 3,
  note: null,
  createdAt: new Date(),
}

const mockBalance = { id: 'balance-1', userId: 'user-1', seasonId: 'season-1', available: 3 }

const mockTx = {
  salesEntry: { create: jest.fn() },
  shotBalance: { upsert: jest.fn() },
}

const mockPrisma = {
  season: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  salesEntry: { findMany: jest.fn() },
  shotBalance: { findUnique: jest.fn() },
  $transaction: jest.fn(),
}

describe('SalesService', () => {
  let service: SalesService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<SalesService>(SalesService)
    jest.clearAllMocks()
  })

  describe('addSalesEntry', () => {
    beforeEach(() => {
      mockPrisma.season.findUnique.mockResolvedValue(mockSeason)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockTx))
      mockTx.salesEntry.create.mockResolvedValue(mockEntry)
      mockTx.shotBalance.upsert.mockResolvedValue(mockBalance)
    })

    it('создаёт запись продажи и начисляет выстрелы', async () => {
      const result = await service.addSalesEntry('season-1', { userId: 'user-1', amount: 30000 })

      expect(result.entry.shots).toBe(3)
      expect(mockTx.salesEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ shots: 3, amount: 30000 }),
        }),
      )
      expect(mockTx.shotBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { available: { increment: 3 } },
          create: expect.objectContaining({ available: 3 }),
        }),
      )
    })

    it('начисляет 0 выстрелов если сумма меньше порога', async () => {
      await service.addSalesEntry('season-1', { userId: 'user-1', amount: 5000 })

      expect(mockTx.salesEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ shots: 0 }),
        }),
      )
    })

    it('выбрасывает BadRequestException если amount <= 0', async () => {
      await expect(
        service.addSalesEntry('season-1', { userId: 'user-1', amount: 0 }),
      ).rejects.toThrow(BadRequestException)
    })

    it('выбрасывает NotFoundException если сезон не найден', async () => {
      mockPrisma.season.findUnique.mockResolvedValue(null)
      await expect(
        service.addSalesEntry('ghost', { userId: 'user-1', amount: 30000 }),
      ).rejects.toThrow(NotFoundException)
    })

    it('выбрасывает NotFoundException если пользователь не найден', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      await expect(
        service.addSalesEntry('season-1', { userId: 'ghost', amount: 30000 }),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('addShots', () => {
    beforeEach(() => {
      mockPrisma.season.findUnique.mockResolvedValue(mockSeason)
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.shotBalance.findUnique.mockResolvedValue(null)
      mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockTx))
      mockTx.shotBalance.upsert.mockResolvedValue(mockBalance)
    })

    it('начисляет выстрелы вручную', async () => {
      const result = await service.addShots('season-1', { userId: 'user-1', amount: 5 })

      expect(result).toEqual(mockBalance)
      expect(mockTx.shotBalance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { available: { increment: 5 } },
          create: expect.objectContaining({ available: 5 }),
        }),
      )
    })

    it('выбрасывает BadRequestException если amount <= 0', async () => {
      await expect(
        service.addShots('season-1', { userId: 'user-1', amount: 0 }),
      ).rejects.toThrow(BadRequestException)
    })

    it('выбрасывает NotFoundException если сезон не найден', async () => {
      mockPrisma.season.findUnique.mockResolvedValue(null)
      await expect(
        service.addShots('ghost', { userId: 'user-1', amount: 5 }),
      ).rejects.toThrow(NotFoundException)
    })

    it('выбрасывает NotFoundException если пользователь не найден', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      await expect(
        service.addShots('season-1', { userId: 'ghost', amount: 5 }),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('findEntries', () => {
    it('возвращает историю продаж сезона (ADMIN)', async () => {
      mockPrisma.salesEntry.findMany.mockResolvedValue([mockEntry])
      const result = await service.findEntries('season-1')
      expect(result).toEqual([mockEntry])
      expect(mockPrisma.salesEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { seasonId: 'season-1' } }),
      )
    })
  })

  describe('findMyEntries', () => {
    it('возвращает личную историю продаж пользователя', async () => {
      mockPrisma.salesEntry.findMany.mockResolvedValue([mockEntry])
      const result = await service.findMyEntries('season-1', 'user-1')
      expect(result).toEqual([mockEntry])
      expect(mockPrisma.salesEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { seasonId: 'season-1', userId: 'user-1' } }),
      )
    })
  })

  describe('getBalance', () => {
    it('возвращает баланс пользователя', async () => {
      mockPrisma.shotBalance.findUnique.mockResolvedValue(mockBalance)
      const result = await service.getBalance('season-1', 'user-1')
      expect(result).toEqual(mockBalance)
    })

    it('возвращает 0 если баланса нет', async () => {
      mockPrisma.shotBalance.findUnique.mockResolvedValue(null)
      const result = await service.getBalance('season-1', 'user-1')
      expect(result).toEqual({ available: 0 })
    })
  })
})
