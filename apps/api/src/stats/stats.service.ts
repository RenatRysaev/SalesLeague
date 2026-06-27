import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getLeaderboard(seasonId: string) {
    const [allShots, hitShots, balances] = await Promise.all([
      this.prisma.shot.groupBy({
        by: ['userId'],
        where: { seasonId },
        _count: { id: true },
      }),
      this.prisma.shot.groupBy({
        by: ['userId'],
        where: { seasonId, isHit: true },
        _count: { id: true },
      }),
      this.prisma.shotBalance.findMany({
        where: { seasonId },
        include: { user: { select: { name: true } } },
      }),
    ])

    const shotsByUser = new Map(allShots.map((r) => [r.userId, r._count.id]))
    const hitsByUser = new Map(hitShots.map((r) => [r.userId, r._count.id]))

    const userMap = new Map<string, { userId: string; name: string; shotsFired: number; hits: number; balance: number }>()

    for (const b of balances) {
      userMap.set(b.userId, {
        userId: b.userId,
        name: b.user.name,
        shotsFired: shotsByUser.get(b.userId) ?? 0,
        hits: hitsByUser.get(b.userId) ?? 0,
        balance: b.available,
      })
    }

    for (const [userId, count] of shotsByUser) {
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          name: '',
          shotsFired: count,
          hits: hitsByUser.get(userId) ?? 0,
          balance: 0,
        })
      }
    }

    return [...userMap.values()].sort((a, b) => b.hits - a.hits || b.shotsFired - a.shotsFired)
  }

  async getSeasonStats(seasonId: string) {
    const [totalShips, sunkShips, totalShots, totalHits] = await Promise.all([
      this.prisma.ship.count({ where: { seasonId } }),
      this.prisma.ship.count({ where: { seasonId, isSunk: true } }),
      this.prisma.shot.count({ where: { seasonId } }),
      this.prisma.shot.count({ where: { seasonId, isHit: true } }),
    ])

    return {
      totalShips,
      sunkShips,
      remainingShips: totalShips - sunkShips,
      totalShots,
      totalHits,
    }
  }
}
