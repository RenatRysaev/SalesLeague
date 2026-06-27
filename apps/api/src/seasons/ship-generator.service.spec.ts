import { Test, TestingModule } from '@nestjs/testing'
import { ShipGeneratorService, SHIP_SIZES } from './ship-generator.service'
import { PrismaService } from '../prisma/prisma.service'

const mockTx = {
  prize: { create: jest.fn() },
  ship: { create: jest.fn() },
}

const mockPrisma = {
  $transaction: jest.fn(),
}

describe('ShipGeneratorService', () => {
  let service: ShipGeneratorService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipGeneratorService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<ShipGeneratorService>(ShipGeneratorService)
    jest.clearAllMocks()
  })

  describe('generateLayout', () => {
    it('генерирует корабли правильных размеров', () => {
      const ships = service.generateLayout()

      const sizes = ships.map((s) => s.length).sort((a, b) => b - a)
      expect(sizes).toEqual([4, 3, 3, 2, 2, 2, 1, 1, 1, 1])
    })

    it('все клетки в пределах поля 0-9', () => {
      const ships = service.generateLayout()

      for (const ship of ships) {
        for (const cell of ship) {
          expect(cell.row).toBeGreaterThanOrEqual(0)
          expect(cell.row).toBeLessThanOrEqual(9)
          expect(cell.col).toBeGreaterThanOrEqual(0)
          expect(cell.col).toBeLessThanOrEqual(9)
        }
      }
    })

    it('корабли не пересекаются', () => {
      const ships = service.generateLayout()

      const occupied = new Set<string>()
      for (const ship of ships) {
        for (const cell of ship) {
          const key = `${cell.row}-${cell.col}`
          expect(occupied.has(key)).toBe(false)
          occupied.add(key)
        }
      }
    })

    it('каждый корабль — горизонтальная или вертикальная линия', () => {
      const ships = service.generateLayout()

      for (const ship of ships) {
        if (ship.length === 1) continue
        const rows = new Set(ship.map((c) => c.row))
        const cols = new Set(ship.map((c) => c.col))
        expect(rows.size === 1 || cols.size === 1).toBe(true)
      }
    })

    it('каждый корабль — непрерывная линия без пропусков', () => {
      const ships = service.generateLayout()

      for (const ship of ships) {
        if (ship.length === 1) continue
        const rows = new Set(ship.map((c) => c.row))
        const isHorizontal = rows.size === 1
        const values = isHorizontal
          ? ship.map((c) => c.col).sort((a, b) => a - b)
          : ship.map((c) => c.row).sort((a, b) => a - b)

        for (let i = 1; i < values.length; i++) {
          expect(values[i]).toBe(values[i - 1] + 1)
        }
      }
    })

    it('генерирует разные раскладки при разных вызовах', () => {
      const a = service.generateLayout()
      const b = service.generateLayout()

      const aStr = JSON.stringify(a)
      const bStr = JSON.stringify(b)
      // С 10 кораблями на поле 10x10 вероятность совпадения практически нулевая
      expect(aStr).not.toBe(bStr)
    })
  })

  describe('placeShipsForSeason', () => {
    it('создаёт призы и корабли для каждого корабля в транзакции', async () => {
      mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockTx))

      let prizeCounter = 0
      mockTx.prize.create.mockImplementation(() => {
        prizeCounter++
        return { id: `prize-${prizeCounter}` }
      })
      mockTx.ship.create.mockResolvedValue({ id: 'ship-1' })

      await service.placeShipsForSeason('season-1')

      expect(mockTx.prize.create).toHaveBeenCalledTimes(SHIP_SIZES.length)
      expect(mockTx.ship.create).toHaveBeenCalledTimes(SHIP_SIZES.length)
    })
  })
})
