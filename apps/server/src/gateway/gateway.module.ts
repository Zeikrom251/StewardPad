import { Module } from '@nestjs/common'
import { SessionModule } from '../session/session.module.js'
import { IncidentsModule } from '../incidents/incidents.module.js'
import { ConfigModule } from '../config/config.module.js'
import { EventsGateway } from './events.gateway.js'

@Module({
  imports: [SessionModule, IncidentsModule, ConfigModule],
  providers: [EventsGateway],
})
export class GatewayModule {}
