import { Controller, Get, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { JwtGuard } from '../auth/jwt/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { Role } from '@prisma/client'

@UseGuards(JwtGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.usersService.findAll()
  }
}
