import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateShipDto, ShipCellDto } from './dto/create-ship.dto'

@Injectable()
export class ShipsService {
  constructor(private prisma: PrismaService) {}

  findAll(seasonId: string) {
    return this.prisma.ship.findMany({
      where: { seasonId },
      include: { cells: true, prize: true },
    })
  }

  async create(seasonId: string, dto: CreateShipDto) {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId } })
    if (!season) throw new NotFoundException('Season not found')

    const prize = await this.prisma.prize.findUnique({
      where: { id: dto.prizeId },
      include: { ship: true },
    })
    if (!prize) throw new NotFoundException('Prize not found')
    if (prize.seasonId !== seasonId) throw new BadRequestException('Prize belongs to another season')
    if (prize.ship) throw new BadRequestException('Prize already has a ship')

    this.validateCells(dto.cells)

    const occupied = await this.prisma.shipCell.findFirst({
      where: {
        ship: { seasonId },
        OR: dto.cells.map((c) => ({ row: c.row, col: c.col })),
      },
    })
    if (occupied) throw new BadRequestException('Cells overlap with existing ship')

    return this.prisma.ship.create({
      data: {
        seasonId,
        prizeId: dto.prizeId,
        cells: { create: dto.cells.map((c) => ({ row: c.row, col: c.col })) },
      },
      include: { cells: true, prize: true },
    })
  }

  async remove(id: string) {
    const ship = await this.prisma.ship.findUnique({ where: { id } })
    if (!ship) throw new NotFoundException('Ship not found')
    if (ship.isSunk) throw new BadRequestException('Cannot delete a sunken ship')

    return this.prisma.ship.delete({ where: { id } })
  }

  private validateCells(cells: ShipCellDto[]) {
    if (cells.length < 1 || cells.length > 4) {
      throw new BadRequestException('Ship must have 1 to 4 cells')
    }

    const outOfBounds = cells.some((c) => c.row < 0 || c.row > 9 || c.col < 0 || c.col > 9)
    if (outOfBounds) throw new BadRequestException('Cells must be within 0-9')

    if (cells.length === 1) return

    const rows = cells.map((c) => c.row)
    const cols = cells.map((c) => c.col)
    const uniqueRows = new Set(rows)
    const uniqueCols = new Set(cols)

    // горизонтальная или вертикальная линия
    const isHorizontal = uniqueRows.size === 1
    const isVertical = uniqueCols.size === 1
    if (!isHorizontal && !isVertical) {
      throw new BadRequestException('Cells must form a horizontal or vertical line')
    }

    // клетки идут подряд без пропусков
    const values = isHorizontal ? cols : rows
    const sorted = [...values].sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        throw new BadRequestException('Cells must be contiguous')
      }
    }
  }
}
