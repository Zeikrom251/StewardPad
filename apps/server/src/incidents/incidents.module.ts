import { Module } from '@nestjs/common'
import { PersistenceModule } from '../persistence/persistence.module.js'
import { SessionModule } from '../session/session.module.js'
import { LmuModule } from '../lmu/lmu.module.js'
import { IncidentsController } from './incidents.controller.js'
import { SessionArchiveController } from './session-archive.controller.js'
import { IncidentsService } from './incidents.service.js'

@Module({
  imports: [PersistenceModule, SessionModule, LmuModule],
  controllers: [IncidentsController, SessionArchiveController],
  providers: [IncidentsService],
  exports: [IncidentsService],
})
export class IncidentsModule {}
