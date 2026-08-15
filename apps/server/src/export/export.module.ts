import { Module } from '@nestjs/common'
import { PersistenceModule } from '../persistence/persistence.module.js'
import { SessionModule } from '../session/session.module.js'
import { ExportController } from './export.controller.js'
import { ExportService } from './export.service.js'

@Module({
  imports: [PersistenceModule, SessionModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
