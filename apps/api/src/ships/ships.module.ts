import { Module } from '@nestjs/common'
import { ShipsService } from './ships.service'
import { ShipsController } from './ships.controller'

@Module({
  controllers: [ShipsController],
  providers: [ShipsService],
  exports: [ShipsService],
})
export class ShipsModule {}
