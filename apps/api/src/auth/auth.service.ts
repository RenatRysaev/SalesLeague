import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { UsersService } from '../users/users.service'
import { User } from '../../generated/prisma/client'
import { jwtConstants } from './auth.constants'

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  auth(user: User) {
    return this.issueTokens(user.id, user.role)
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string; role: string }>(refreshToken, {
        secret: jwtConstants.refreshSecret,
      })
      const user = await this.usersService.getUserById(payload.sub)
      if (!user) throw new UnauthorizedException()
      return this.issueTokens(user.id, user.role)
    } catch {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }

  async validatePassword(email: string, password: string) {
    const user = await this.usersService.getUserByEmail(email)
    if (!user) return null

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) return null

    const { passwordHash, ...result } = user
    return result
  }

  private issueTokens(userId: string, role: string) {
    const payload = { sub: userId, role }
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refresh_token: this.jwtService.sign(payload, {
        secret: jwtConstants.refreshSecret,
        expiresIn: '30d',
      }),
    }
  }
}
