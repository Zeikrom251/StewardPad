import { Module } from '@nestjs/common'
import { LmuModule } from './lmu/lmu.module.js'
import { PersistenceModule } from './persistence/persistence.module.js'
import { SessionModule } from './session/session.module.js'
import { IncidentsModule } from './incidents/incidents.module.js'
import { ConfigModule } from './config/config.module.js'
import { ExportModule } from './export/export.module.js'
import { GatewayModule } from './gateway/gateway.module.js'

@Module({
  imports: [
    LmuModule,
    PersistenceModule,
    SessionModule,
    IncidentsModule,
    ConfigModule,
    ExportModule,
    GatewayModule,
  ],
})
export class AppModule {}
