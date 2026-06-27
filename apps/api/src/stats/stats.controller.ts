import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { StatsService } from './stats.service'
import { JwtGuard } from '../auth/jwt/jwt.guard'

@UseGuards(JwtGuard)
@Controller('seasons/:seasonId')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('leaderboard')
  getLeaderboard(@Param('seasonId') seasonId: string) {
    return this.statsService.getLeaderboard(seasonId)
  }

  @Get('stats')
  getSeasonStats(@Param('seasonId') seasonId: string) {
    return this.statsService.getSeasonStats(seasonId)
  }
}
