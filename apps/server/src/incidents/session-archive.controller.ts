/**
 * Lives in the incidents module (which owns the working store) rather than
 * the session module, to avoid a module import cycle: IncidentsModule
 * already depends on SessionModule for standings/session lookups.
 */
import { Controller, HttpCode, Post } from '@nestjs/common'
import { IncidentsService } from './incidents.service.js'
import { SessionService } from '../session/session.service.js'

@Controller('session')
export class SessionArchiveController {
  constructor(
    private readonly incidentsService: IncidentsService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('archive')
  @HttpCode(200)
  async archive(): Promise<{ archived: boolean }> {
    await this.incidentsService.archive(this.sessionService.getSession().trackName)
    return { archived: true }
  }
}
