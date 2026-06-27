import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { UnauthorizedException } from '@nestjs/common'
import { AuthService } from './auth.service'
import { UsersService } from '../users/users.service'
import { Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  passwordHash: bcrypt.hashSync('password123', 10),
  role: Role.EMPLOYEE,
  createdAt: new Date(),
}

const mockUsersService = {
  getUserByEmail: jest.fn(),
  getUserById: jest.fn(),
}

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-token'),
  verify: jest.fn(),
}

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile()

    authService = module.get<AuthService>(AuthService)
    jest.clearAllMocks()
    mockJwtService.sign.mockReturnValue('signed-token')
  })

  describe('auth', () => {
    it('возвращает access_token и refresh_token', () => {
      const result = authService.auth(mockUser)
      expect(result).toHaveProperty('access_token')
      expect(result).toHaveProperty('refresh_token')
    })
  })

  describe('refresh', () => {
    it('возвращает новую пару токенов при валидном refresh_token', async () => {
      mockJwtService.verify.mockReturnValue({ sub: mockUser.id, role: mockUser.role })
      mockUsersService.getUserById.mockResolvedValue(mockUser)

      const result = await authService.refresh('valid-refresh-token')

      expect(result).toHaveProperty('access_token')
      expect(result).toHaveProperty('refresh_token')
    })

    it('выбрасывает UnauthorizedException при невалидном токене', async () => {
      mockJwtService.verify.mockImplementation(() => { throw new Error('invalid') })

      await expect(authService.refresh('bad-token')).rejects.toThrow(UnauthorizedException)
    })

    it('выбрасывает UnauthorizedException если пользователь не найден', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'ghost-id', role: Role.EMPLOYEE })
      mockUsersService.getUserById.mockResolvedValue(null)

      await expect(authService.refresh('valid-token')).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('validatePassword', () => {
    it('возвращает пользователя без passwordHash при верном пароле', async () => {
      mockUsersService.getUserByEmail.mockResolvedValue(mockUser)

      const result = await authService.validatePassword('test@example.com', 'password123')

      expect(result).not.toBeNull()
      expect(result).not.toHaveProperty('passwordHash')
      expect(result?.email).toBe('test@example.com')
    })

    it('возвращает null при неверном пароле', async () => {
      mockUsersService.getUserByEmail.mockResolvedValue(mockUser)

      const result = await authService.validatePassword('test@example.com', 'wrong')

      expect(result).toBeNull()
    })

    it('возвращает null если пользователь не найден', async () => {
      mockUsersService.getUserByEmail.mockResolvedValue(null)

      const result = await authService.validatePassword('nobody@example.com', 'password123')

      expect(result).toBeNull()
    })
  })
})
