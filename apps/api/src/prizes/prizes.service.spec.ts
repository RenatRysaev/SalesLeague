import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { PrizesService } from './prizes.service'
import { PrismaService } from '../prisma/prisma.service'

const mockSeason = { id: 'season-1', name: 'Сезон 1', isActive: true }

const mockPrize = {
  id: 'prize-1',
  name: 'iPhone 15',
  description: null,
  seasonId: 'season-1',
  ship: null,
}

const mockPrisma = {
  season: { findUnique: jest.fn() },
  prize: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
}

describe('PrizesService', () => {
  let service: PrizesService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrizesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<PrizesService>(PrizesService)
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('возвращает призы сезона', async () => {
      mockPrisma.prize.findMany.mockResolvedValue([mockPrize])
      const result = await service.findAll('season-1')
      expect(result).toEqual([mockPrize])
      expect(mockPrisma.prize.findMany).toHaveBeenCalledWith({
        where: { seasonId: 'season-1' },
        include: { ship: true },
      })
    })
  })

  describe('create', () => {
    it('создаёт приз для существующего сезона', async () => {
      mockPrisma.season.findUnique.mockResolvedValue(mockSeason)
      mockPrisma.prize.create.mockResolvedValue(mockPrize)

      const result = await service.create('season-1', { name: 'iPhone 15' })

      expect(result).toEqual(mockPrize)
      expect(mockPrisma.prize.create).toHaveBeenCalledWith({
        data: { name: 'iPhone 15', description: undefined, seasonId: 'season-1' },
      })
    })

    it('выбрасывает NotFoundException если сезон не найден', async () => {
      mockPrisma.season.findUnique.mockResolvedValue(null)
      await expect(service.create('ghost-id', { name: 'iPhone 15' })).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('удаляет приз без корабля', async () => {
      mockPrisma.prize.findUnique.mockResolvedValue(mockPrize)
      mockPrisma.prize.delete.mockResolvedValue(mockPrize)

      const result = await service.remove('prize-1')
      expect(result).toEqual(mockPrize)
    })

    it('выбрасывает NotFoundException если приз не найден', async () => {
      mockPrisma.prize.findUnique.mockResolvedValue(null)
      await expect(service.remove('ghost-id')).rejects.toThrow(NotFoundException)
    })

    it('выбрасывает BadRequestException если приз уже привязан к кораблю', async () => {
      mockPrisma.prize.findUnique.mockResolvedValue({ ...mockPrize, ship: { id: 'ship-1' } })
      await expect(service.remove('prize-1')).rejects.toThrow(BadRequestException)
    })
  })
})
