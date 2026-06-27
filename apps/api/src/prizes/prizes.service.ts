import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreatePrizeDto } from './dto/create-prize.dto'

@Injectable()
export class PrizesService {
  constructor(private prisma: PrismaService) {}

  findAll(seasonId: string) {
    return this.prisma.prize.findMany({
      where: { seasonId },
      include: { ship: true },
    })
  }

  async create(seasonId: string, dto: CreatePrizeDto) {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId } })
    if (!season) throw new NotFoundException('Season not found')

    return this.prisma.prize.create({
      data: { name: dto.name, description: dto.description, seasonId },
    })
  }

  async remove(id: string) {
    const prize = await this.prisma.prize.findUnique({ where: { id }, include: { ship: true } })
    if (!prize) throw new NotFoundException('Prize not found')
    if (prize.ship) throw new BadRequestException('Prize is already attached to a ship')

    return this.prisma.prize.delete({ where: { id } })
  }
}
