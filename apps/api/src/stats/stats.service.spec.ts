import { Test, TestingModule } from '@nestjs/testing'
import { StatsService } from './stats.service'
import { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
  shot: { groupBy: jest.fn(), count: jest.fn() },
  shotBalance: { findMany: jest.fn() },
  ship: { count: jest.fn() },
}

describe('StatsService', () => {
  let service: StatsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<StatsService>(StatsService)
    jest.clearAllMocks()
  })

  describe('getLeaderboard', () => {
    it('возвращает рейтинг с выстрелами и попаданиями по каждому пользователю', async () => {
      mockPrisma.shot.groupBy.mockResolvedValueOnce([
        { userId: 'user-1', _count: { id: 5 }, user: { name: 'Иван' } },
      ])
      mockPrisma.shot.groupBy.mockResolvedValueOnce([
        { userId: 'user-1', _count: { id: 2 } },
      ])
      mockPrisma.shotBalance.findMany.mockResolvedValue([
        { userId: 'user-1', available: 3, user: { name: 'Иван' } },
      ])

      const result = await service.getLeaderboard('season-1')

      expect(result).toEqual([
        { userId: 'user-1', name: 'Иван', shotsFired: 5, hits: 2, balance: 3 },
      ])
    })

    it('включает пользователей с балансом но без выстрелов', async () => {
      mockPrisma.shot.groupBy.mockResolvedValueOnce([])
      mockPrisma.shot.groupBy.mockResolvedValueOnce([])
      mockPrisma.shotBalance.findMany.mockResolvedValue([
        { userId: 'user-2', available: 5, user: { name: 'Мария' } },
      ])

      const result = await service.getLeaderboard('season-1')

      expect(result).toEqual([
        { userId: 'user-2', name: 'Мария', shotsFired: 0, hits: 0, balance: 5 },
      ])
    })
  })

  describe('getSeasonStats', () => {
    it('возвращает агрегированную статистику сезона', async () => {
      mockPrisma.ship.count.mockResolvedValueOnce(10)
      mockPrisma.ship.count.mockResolvedValueOnce(4)
      mockPrisma.shot.count.mockResolvedValueOnce(30)
      mockPrisma.shot.count.mockResolvedValueOnce(12)

      const result = await service.getSeasonStats('season-1')

      expect(result).toEqual({
        totalShips: 10,
        sunkShips: 4,
        remainingShips: 6,
        totalShots: 30,
        totalHits: 12,
      })
    })
  })
})
