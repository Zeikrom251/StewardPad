import { Module } from '@nestjs/common'
import { LmuModule } from '../lmu/lmu.module.js'
import { SessionController } from './session.controller.js'
import { StandingsController } from './standings.controller.js'
import { SessionService } from './session.service.js'

@Module({
  imports: [LmuModule],
  controllers: [SessionController, StandingsController],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
