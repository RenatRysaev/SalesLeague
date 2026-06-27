import { Test, TestingModule } from '@nestjs/testing'
import { ConflictException } from '@nestjs/common'
import { UsersService } from './users.service'
import { PrismaService } from '../prisma/prisma.service'
import { Role } from '../../generated/prisma/client'

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
}

describe('UsersService', () => {
  let usersService: UsersService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    usersService = module.get<UsersService>(UsersService)
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('создаёт пользователя и не возвращает passwordHash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        name: 'John',
        email: 'john@example.com',
        passwordHash: 'hashed',
        role: Role.EMPLOYEE,
        createdAt: new Date(),
      })

      const result = await usersService.create({
        name: 'John',
        email: 'john@example.com',
        password: 'secret',
      })

      expect(result).not.toHaveProperty('passwordHash')
      expect(result.email).toBe('john@example.com')
      expect(result.role).toBe(Role.EMPLOYEE)
    })

    it('выбрасывает ConflictException если email занят', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' })

      await expect(
        usersService.create({ name: 'John', email: 'john@example.com', password: 'secret' }),
      ).rejects.toThrow(ConflictException)
    })

    it('хеширует пароль перед сохранением', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        name: 'John',
        email: 'john@example.com',
        passwordHash: 'hashed',
        role: Role.EMPLOYEE,
        createdAt: new Date(),
      })

      await usersService.create({ name: 'John', email: 'john@example.com', password: 'secret' })

      const createCall = mockPrisma.user.create.mock.calls[0][0]
      expect(createCall.data.passwordHash).not.toBe('secret')
      expect(createCall.data.passwordHash).toMatch(/^\$2[ab]\$/)
    })
  })
})
