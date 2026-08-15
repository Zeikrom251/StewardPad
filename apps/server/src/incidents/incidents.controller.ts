import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common'
import type { Incident } from '@stewardpad/shared'
import { IncidentsService } from './incidents.service.js'
import { CreateIncidentDto } from './dto/create-incident.dto.js'
import { MergeIncidentsDto } from './dto/merge-incidents.dto.js'
import { UpdateIncidentDto } from './dto/update-incident.dto.js'
import { QuickLogDto } from './dto/quick-log.dto.js'

@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  list(): Incident[] {
    return this.incidentsService.list()
  }

  @Post()
  create(@Body() dto: CreateIncidentDto): Incident {
    return this.incidentsService.create(dto)
  }

  @Post('quick')
  quickLog(@Body() dto: QuickLogDto): Incident {
    return this.incidentsService.quickLog(dto)
  }

  @Post('merge')
  merge(@Body() dto: MergeIncidentsDto): Incident {
    return this.incidentsService.merge(dto)
  }

  /** Clear-all. Archives a copy first — clearing is a steward action, not a data-loss one. */
  @Delete()
  @HttpCode(204)
  clearAll(): Promise<void> {
    return this.incidentsService.archive()
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Incident {
    return this.incidentsService.get(id)
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateIncidentDto,
  ): Incident {
    return this.incidentsService.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): void {
    this.incidentsService.remove(id)
  }
}
