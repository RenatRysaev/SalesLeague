import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { SeasonsService } from './seasons.service'
import { CreateSeasonDto } from './dto/create-season.dto'
import { JwtGuard } from '../auth/jwt/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { Role } from '@prisma/client'

@UseGuards(JwtGuard)
@Controller('seasons')
export class SeasonsController {
  constructor(private seasonsService: SeasonsService) {}

  @Get()
  findAll() {
    return this.seasonsService.findAll()
  }

  @Get('active')
  findActive() {
    return this.seasonsService.findActive()
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateSeasonDto) {
    return this.seasonsService.create(dto)
  }

  @Roles(Role.ADMIN)
  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.seasonsService.activate(id)
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.seasonsService.remove(id)
  }
}
