import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module'
import { AuthModule } from './auth/auth.module'
import { RolesGuard } from './auth/roles.guard'
import { SeasonsModule } from './seasons/seasons.module'
import { PrizesModule } from './prizes/prizes.module'
import { ShipsModule } from './ships/ships.module'

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, SeasonsModule, PrizesModule, ShipsModule],
  providers: [
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
