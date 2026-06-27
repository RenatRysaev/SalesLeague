import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateSeasonDto } from './dto/create-season.dto'

@Injectable()
export class SeasonsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.season.findMany({ orderBy: { createdAt: 'desc' } })
  }

  async findActive() {
    const season = await this.prisma.season.findFirst({ where: { isActive: true } })
    if (!season) throw new NotFoundException('No active season')
    return season
  }

  create(dto: CreateSeasonDto) {
    return this.prisma.season.create({
      data: { name: dto.name, amountPerShot: dto.amountPerShot, isActive: false },
    })
  }

  async activate(id: string) {
    const season = await this.prisma.season.findUnique({ where: { id } })
    if (!season) throw new NotFoundException('Season not found')
    if (season.isActive) throw new BadRequestException('Season is already active')

    return this.prisma.$transaction(async (tx) => {
      await tx.season.updateMany({ where: { isActive: true }, data: { isActive: false } })
      return tx.season.update({ where: { id }, data: { isActive: true } })
    })
  }

  async remove(id: string) {
    const season = await this.prisma.season.findUnique({ where: { id } })
    if (!season) throw new NotFoundException('Season not found')
    if (season.isActive) throw new BadRequestException('Cannot delete active season')
    return this.prisma.season.delete({ where: { id } })
  }
}
