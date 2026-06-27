import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { SeasonsService } from './seasons.service'
import { PrismaService } from '../prisma/prisma.service'
import { ShipGeneratorService } from './ship-generator.service'

const mockShipGenerator = {
  placeShipsForSeason: jest.fn().mockResolvedValue(undefined),
}

const mockSeason = {
  id: 'season-1',
  name: 'Сезон 1',
  amountPerShot: 10000,
  isActive: false,
  createdAt: new Date(),
}

const activeSeason = { ...mockSeason, id: 'season-active', isActive: true }

const mockPrisma = {
  season: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
}

describe('SeasonsService', () => {
  let service: SeasonsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeasonsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ShipGeneratorService, useValue: mockShipGenerator },
      ],
    }).compile()

    service = module.get<SeasonsService>(SeasonsService)
    jest.clearAllMocks()
  })

  describe('findAll', () => {
    it('возвращает список сезонов', async () => {
      mockPrisma.season.findMany.mockResolvedValue([mockSeason])
      const result = await service.findAll()
      expect(result).toEqual([mockSeason])
      expect(mockPrisma.season.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('findActive', () => {
    it('возвращает активный сезон', async () => {
      mockPrisma.season.findFirst.mockResolvedValue(activeSeason)
      const result = await service.findActive()
      expect(result).toEqual(activeSeason)
    })

    it('выбрасывает NotFoundException если нет активного сезона', async () => {
      mockPrisma.season.findFirst.mockResolvedValue(null)
      await expect(service.findActive()).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('создаёт сезон с isActive: false', async () => {
      mockPrisma.season.create.mockResolvedValue(mockSeason)
      const result = await service.create({ name: 'Сезон 1', amountPerShot: 10000 })
      expect(result).toEqual(mockSeason)
      expect(mockPrisma.season.create).toHaveBeenCalledWith({
        data: { name: 'Сезон 1', amountPerShot: 10000, isActive: false },
      })
    })
  })

  describe('activate', () => {
    it('деактивирует все сезоны и активирует нужный', async () => {
      const activated = { ...mockSeason, isActive: true }
      mockPrisma.season.findUnique
        .mockResolvedValueOnce(mockSeason)   // проверка существования
        .mockResolvedValueOnce(activated)    // финальный return
      mockPrisma.$transaction.mockImplementation((fn: any) => fn({
        ...mockPrisma,
        ship: { deleteMany: jest.fn() },
        prize: { deleteMany: jest.fn() },
      }))
      mockPrisma.season.updateMany.mockResolvedValue({ count: 1 })
      mockPrisma.season.update.mockResolvedValue(activated)

      const result = await service.activate('season-1')

      expect(mockPrisma.season.updateMany).toHaveBeenCalledWith({
        where: { isActive: true },
        data: { isActive: false },
      })
      expect(mockPrisma.season.update).toHaveBeenCalledWith({
        where: { id: 'season-1' },
        data: { isActive: true },
      })
      expect(result!.isActive).toBe(true)
    })

    it('выбрасывает NotFoundException если сезон не найден', async () => {
      mockPrisma.season.findUnique.mockResolvedValueOnce(null)
      await expect(service.activate('ghost-id')).rejects.toThrow(NotFoundException)
    })

    it('выбрасывает BadRequestException если сезон уже активен', async () => {
      mockPrisma.season.findUnique.mockResolvedValue(activeSeason)
      await expect(service.activate('season-active')).rejects.toThrow(BadRequestException)
    })
  })

  describe('remove', () => {
    it('удаляет неактивный сезон', async () => {
      mockPrisma.season.findUnique.mockResolvedValue(mockSeason)
      mockPrisma.season.delete.mockResolvedValue(mockSeason)
      const result = await service.remove('season-1')
      expect(result).toEqual(mockSeason)
    })

    it('выбрасывает NotFoundException если сезон не найден', async () => {
      mockPrisma.season.findUnique.mockResolvedValue(null)
      await expect(service.remove('ghost-id')).rejects.toThrow(NotFoundException)
    })

    it('выбрасывает BadRequestException при попытке удалить активный сезон', async () => {
      mockPrisma.season.findUnique.mockResolvedValue(activeSeason)
      await expect(service.remove('season-active')).rejects.toThrow(BadRequestException)
    })
  })
})
