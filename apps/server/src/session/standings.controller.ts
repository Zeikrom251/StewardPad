import { Controller, Get } from '@nestjs/common'
import type { StandingEntry } from '@stewardpad/shared'
import { SessionService } from './session.service.js'

@Controller('standings')
export class StandingsController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  getStandings(): StandingEntry[] {
    return this.sessionService.getStandings()
  }
}
