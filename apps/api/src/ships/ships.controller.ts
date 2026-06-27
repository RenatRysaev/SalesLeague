import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { ShipsService } from './ships.service'
import { CreateShipDto } from './dto/create-ship.dto'
import { Roles } from '../auth/roles.decorator'
import { Role } from '@prisma/client'

@Controller()
export class ShipsController {
  constructor(private shipsService: ShipsService) {}

  @Get('seasons/:seasonId/ships')
  findAll(@Param('seasonId') seasonId: string) {
    return this.shipsService.findAll(seasonId)
  }

  @Roles(Role.ADMIN)
  @Post('seasons/:seasonId/ships')
  create(@Param('seasonId') seasonId: string, @Body() dto: CreateShipDto) {
    return this.shipsService.create(seasonId, dto)
  }

  @Roles(Role.ADMIN)
  @Delete('ships/:id')
  remove(@Param('id') id: string) {
    return this.shipsService.remove(id)
  }
}
