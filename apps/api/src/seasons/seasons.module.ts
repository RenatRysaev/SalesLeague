import { Module } from '@nestjs/common'
import { SeasonsService } from './seasons.service'
import { SeasonsController } from './seasons.controller'
import { ShipGeneratorService } from './ship-generator.service'

@Module({
  controllers: [SeasonsController],
  providers: [SeasonsService, ShipGeneratorService],
  exports: [SeasonsService],
})
export class SeasonsModule {}
