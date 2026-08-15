import { Injectable } from '@nestjs/common'
import type { CsvDelimiter, CsvVariant } from '@stewardpad/shared'
import { PersistenceService } from '../persistence/persistence.service.js'
import { SessionService } from '../session/session.service.js'
import { isActiveIncident } from '../incidents/merge-incidents.js'
import { slugify } from '../common/slugify.js'
import { buildIncidentCsv } from './incident-csv.js'

export interface CsvExport {
  csv: string
  filename: string
}

@Injectable()
export class ExportService {
  constructor(
    private readonly persistenceService: PersistenceService,
    private readonly sessionService: SessionService,
  ) {}

  buildCsv(variant: CsvVariant = 'full', delimiter: CsvDelimiter = 'semicolon'): CsvExport {
    const allIncidents = this.persistenceService.listIncidents()
    const active = allIncidents.filter(isActiveIncident)
    const delimiterChar = delimiter === 'comma' ? ',' : ';'
    const csv = buildIncidentCsv(active, variant, delimiterChar, allIncidents)
    const track = slugify(this.sessionService.getSession().trackName)
    const isoDate = new Date().toISOString().slice(0, 10)
    return { csv, filename: `lmu-incidents-${track}-${isoDate}.csv` }
  }
}
