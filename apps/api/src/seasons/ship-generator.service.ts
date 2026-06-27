import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

export const SHIP_SIZES = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1]

interface Cell { row: number; col: number }

@Injectable()
export class ShipGeneratorService {
  constructor(private prisma: PrismaService) {}

  generateLayout(): Cell[][] {
    const occupied = new Set<string>()
    const ships: Cell[][] = []

    for (const size of SHIP_SIZES) {
      const cells = this.placeShip(size, occupied)
      ships.push(cells)
      for (const c of cells) occupied.add(`${c.row}-${c.col}`)
    }

    return ships
  }

  async placeShipsForSeason(seasonId: string) {
    const layout = this.generateLayout()

    return this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < layout.length; i++) {
        const cells = layout[i]
        const prize = await tx.prize.create({
          data: { name: `Приз ${i + 1}`, seasonId },
        })
        await tx.ship.create({
          data: {
            seasonId,
            prizeId: prize.id,
            cells: { create: cells },
          },
        })
      }
    })
  }

  private placeShip(size: number, occupied: Set<string>): Cell[] {
    const MAX_ATTEMPTS = 1000

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const horizontal = Math.random() < 0.5
      const row = Math.floor(Math.random() * (horizontal ? 10 : 11 - size))
      const col = Math.floor(Math.random() * (horizontal ? 11 - size : 10))

      const cells: Cell[] = Array.from({ length: size }, (_, i) => ({
        row: horizontal ? row : row + i,
        col: horizontal ? col + i : col,
      }))

      if (this.hasConflict(cells, occupied)) continue

      return cells
    }

    // Fallback: сканируем поле последовательно если случайный поиск не нашёл место
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        for (const horizontal of [true, false]) {
          if (horizontal && col + size > 10) continue
          if (!horizontal && row + size > 10) continue

          const cells: Cell[] = Array.from({ length: size }, (_, i) => ({
            row: horizontal ? row : row + i,
            col: horizontal ? col + i : col,
          }))

          if (!this.hasConflict(cells, occupied)) return cells
        }
      }
    }

    throw new Error(`Cannot place ship of size ${size}`)
  }

  private hasConflict(cells: Cell[], occupied: Set<string>): boolean {
    for (const c of cells) {
      // Проверяем саму клетку и соседей (корабли не должны касаться)
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (occupied.has(`${c.row + dr}-${c.col + dc}`)) return true
        }
      }
    }
    return false
  }
}
