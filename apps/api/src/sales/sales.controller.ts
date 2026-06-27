import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common'
import { SalesService } from './sales.service'
import { CreateSalesEntryDto } from './dto/create-sales-entry.dto'
import { AddShotsDto } from './dto/add-shots.dto'
import { Roles } from '../auth/roles.decorator'
import { Role } from '@prisma/client'

@Controller('seasons/:seasonId')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Roles(Role.ADMIN)
  @Post('sales')
  addSalesEntry(@Param('seasonId') seasonId: string, @Body() dto: CreateSalesEntryDto) {
    return this.salesService.addSalesEntry(seasonId, dto)
  }

  @Roles(Role.ADMIN)
  @Get('sales')
  findEntries(@Param('seasonId') seasonId: string) {
    return this.salesService.findEntries(seasonId)
  }

  @Get('sales/my')
  findMyEntries(@Param('seasonId') seasonId: string, @Req() req: any) {
    return this.salesService.findMyEntries(seasonId, req.user.id)
  }

  @Roles(Role.ADMIN)
  @Post('balance/add')
  addShots(@Param('seasonId') seasonId: string, @Body() dto: AddShotsDto) {
    return this.salesService.addShots(seasonId, dto)
  }

  @Get('balance')
  getBalance(@Param('seasonId') seasonId: string, @Req() req: any) {
    return this.salesService.getBalance(seasonId, req.user.id)
  }
}
