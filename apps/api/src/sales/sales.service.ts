import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateSalesEntryDto } from './dto/create-sales-entry.dto'
import { AddShotsDto } from './dto/add-shots.dto'

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  async addSalesEntry(seasonId: string, dto: CreateSalesEntryDto) {
    if (dto.amount <= 0) throw new BadRequestException('Amount must be positive')

    const [season, user] = await Promise.all([
      this.prisma.season.findUnique({ where: { id: seasonId } }),
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
    ])
    if (!season) throw new NotFoundException('Season not found')
    if (!user) throw new NotFoundException('User not found')

    const shots = Math.floor(dto.amount / season.amountPerShot)

    const result = await this.prisma.$transaction(async (tx) => {
      const entry = await tx.salesEntry.create({
        data: { userId: dto.userId, seasonId, amount: dto.amount, shots, note: dto.note },
      })

      const balance = await tx.shotBalance.upsert({
        where: { userId_seasonId: { userId: dto.userId, seasonId } },
        update: { available: { increment: shots } },
        create: { userId: dto.userId, seasonId, available: shots },
      })

      return { entry, balance }
    })

    return result
  }

  async addShots(seasonId: string, dto: AddShotsDto) {
    if (dto.amount <= 0) throw new BadRequestException('Amount must be positive')

    const [season, user] = await Promise.all([
      this.prisma.season.findUnique({ where: { id: seasonId } }),
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
    ])
    if (!season) throw new NotFoundException('Season not found')
    if (!user) throw new NotFoundException('User not found')

    return this.prisma.$transaction(async (tx) => {
      return tx.shotBalance.upsert({
        where: { userId_seasonId: { userId: dto.userId, seasonId } },
        update: { available: { increment: dto.amount } },
        create: { userId: dto.userId, seasonId, available: dto.amount },
      })
    })
  }

  findEntries(seasonId: string) {
    return this.prisma.salesEntry.findMany({
      where: { seasonId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  findMyEntries(seasonId: string, userId: string) {
    return this.prisma.salesEntry.findMany({
      where: { seasonId, userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getBalance(seasonId: string, userId: string) {
    const balance = await this.prisma.shotBalance.findUnique({
      where: { userId_seasonId: { userId, seasonId } },
    })
    return balance ?? { available: 0 }
  }
}
