import { Injectable, ConflictException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { CreateUserDto } from './dto/create-user.dto'
import { Role } from '@prisma/client'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) throw new ConflictException('Email already in use')

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const { passwordHash: _, ...user } = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role ?? Role.EMPLOYEE,
      },
    })
    return user
  }

  async getUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } })
  }

  async getUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } })
  }
}
