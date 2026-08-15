import { Controller, Get } from '@nestjs/common'
import type { SessionInfo } from '@stewardpad/shared'
import { SessionService } from './session.service.js'

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  getSession(): SessionInfo {
    return this.sessionService.getSession()
  }
}
