import { Controller, Get, Query, Res } from '@nestjs/common'
import { ExportService } from './export.service.js'
import { ExportCsvQueryDto } from './dto/export-csv-query.dto.js'

/** Structural subset of Express's Response — avoids depending on @types/express. */
interface CsvResponse {
  setHeader(name: string, value: string): unknown
}

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('csv')
  downloadCsv(
    @Query() query: ExportCsvQueryDto,
    @Res({ passthrough: true }) res: CsvResponse,
  ): string {
    const { csv, filename } = this.exportService.buildCsv(query.variant, query.delimiter)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return csv
  }
}
