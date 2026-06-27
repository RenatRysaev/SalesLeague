import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common'
import { ShotsService } from './shots.service'
import { FireShotDto } from './dto/fire-shot.dto'
import { JwtGuard } from '../auth/jwt/jwt.guard'
import { Roles } from '../auth/roles.decorator'
import { Role } from '@prisma/client'

@UseGuards(JwtGuard)
@Controller('seasons/:seasonId/shots')
export class ShotsController {
  constructor(private shotsService: ShotsService) {}

  @Post()
  fire(
    @Param('seasonId') seasonId: string,
    @Body() dto: FireShotDto,
    @Req() req: any,
  ) {
    return this.shotsService.fire(seasonId, req.user.id, dto)
  }

  @Get()
  findHistory(@Param('seasonId') seasonId: string, @Req() req: any) {
    return this.shotsService.findHistory(seasonId, req.user.id)
  }

  @Roles(Role.ADMIN)
  @Get('all')
  findAllHistory(@Param('seasonId') seasonId: string) {
    return this.shotsService.findAllHistory(seasonId)
  }
}
