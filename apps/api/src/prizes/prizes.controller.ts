import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { PrizesService } from './prizes.service'
import { CreatePrizeDto } from './dto/create-prize.dto'
import { JwtGuard } from '../auth/jwt/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { Role } from '@prisma/client'

@UseGuards(JwtGuard)
@Controller('seasons/:seasonId/prizes')
export class PrizesController {
  constructor(private prizesService: PrizesService) {}

  @Get()
  findAll(@Param('seasonId') seasonId: string) {
    return this.prizesService.findAll(seasonId)
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Param('seasonId') seasonId: string, @Body() dto: CreatePrizeDto) {
    return this.prizesService.create(seasonId, dto)
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.prizesService.remove(id)
  }
}
