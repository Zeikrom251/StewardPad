import type { OnModuleInit } from '@nestjs/common'
import type { OnGatewayConnection, OnGatewayInit } from '@nestjs/websockets'
import { WebSocketGateway } from '@nestjs/websockets'
import { throttleTime } from 'rxjs'
import type { Server, Socket } from 'socket.io'
import type { ServerEvents } from '@stewardpad/shared'
import { SessionService } from '../session/session.service.js'
import { IncidentsService } from '../incidents/incidents.service.js'
import { ConfigService } from '../config/config.service.js'

const STANDINGS_THROTTLE_MS = 1000

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnModuleInit {
  private server: Server | null = null

  constructor(
    private readonly sessionService: SessionService,
    private readonly incidentsService: IncidentsService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server): void {
    this.server = server
  }

  /** So a page load isn't blank until the next tick. */
  handleConnection(client: Socket): void {
    client.emit('session:update', this.sessionService.getSession())
    client.emit('standings:update', this.sessionService.getStandings())
    client.emit('incidents:update', this.incidentsService.list())
    client.emit('config:update', this.configService.get())
  }

  onModuleInit(): void {
    this.sessionService.updates$.subscribe((u) => this.emit('session:update', u.session))
    this.sessionService.updates$
      .pipe(throttleTime(STANDINGS_THROTTLE_MS, undefined, { leading: true, trailing: true }))
      .subscribe((u) => this.emit('standings:update', u.standings))
    this.incidentsService.changes$.subscribe(() =>
      this.emit('incidents:update', this.incidentsService.list()),
    )
    this.configService.changes$.subscribe((config) => this.emit('config:update', config))
  }

  private emit<K extends keyof ServerEvents>(event: K, payload: ServerEvents[K]): void {
    this.server?.emit(event, payload)
  }
}
