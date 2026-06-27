import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { FireShotDto } from './dto/fire-shot.dto'

@Injectable()
export class ShotsService {
  constructor(private prisma: PrismaService) {}

  async fire(seasonId: string, userId: string, dto: FireShotDto) {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId } })
    if (!season) throw new NotFoundException('Season not found')
    if (!season.isActive) throw new BadRequestException('Season is not active')

    const alreadyShot = await this.prisma.shot.findUnique({
      where: { seasonId_row_col: { seasonId, row: dto.row, col: dto.col } },
    })
    if (alreadyShot) throw new BadRequestException('Cell already targeted')

    const balance = await this.prisma.shotBalance.findUnique({
      where: { userId_seasonId: { userId, seasonId } },
    })
    if (!balance || balance.available <= 0) throw new ForbiddenException('No shots available')

    return this.prisma.$transaction(async (tx) => {
      const hitCell = await tx.shipCell.findFirst({
        where: { row: dto.row, col: dto.col, ship: { seasonId } },
        include: { ship: { include: { cells: true, prize: true } } },
      })

      const isHit = !!hitCell
      const shipId = hitCell?.shipId ?? null

      const shot = await tx.shot.create({
        data: { userId, seasonId, row: dto.row, col: dto.col, isHit, shipId },
      })

      await tx.shotBalance.update({
        where: { userId_seasonId: { userId, seasonId } },
        data: { available: { decrement: 1 } },
      })

      let isSunk = false
      let prize: { id: string; name: string; description: string | null; seasonId: string } | null = null

      if (isHit && hitCell?.ship) {
        const ship = hitCell.ship
        const shotCells = await tx.shot.findMany({
          where: { seasonId, shipId: ship.id, isHit: true },
        })

        if (shotCells.length >= ship.cells.length) {
          await tx.ship.update({ where: { id: ship.id }, data: { isSunk: true } })
          isSunk = true
          prize = ship.prize
        }
      }

      return { ...shot, isSunk, prize }
    })
  }

  findHistory(seasonId: string, userId: string) {
    return this.prisma.shot.findMany({
      where: { seasonId, userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  findAllHistory(seasonId: string) {
    return this.prisma.shot.findMany({
      where: { seasonId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }
}
