import { Body, Controller, Get, Patch } from '@nestjs/common'
import type { AppConfig } from '@stewardpad/shared'
import { ConfigService } from './config.service.js'
import { UpdateConfigDto } from './dto/update-config.dto.js'

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  get(): AppConfig {
    return this.configService.get()
  }

  @Patch()
  update(@Body() dto: UpdateConfigDto): AppConfig {
    return this.configService.update(dto)
  }
}
