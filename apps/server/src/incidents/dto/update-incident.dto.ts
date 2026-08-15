import { CreateIncidentDto } from './create-incident.dto.js'

/** Same optional shape as create — a PATCH is just a partial re-application. */
export class UpdateIncidentDto extends CreateIncidentDto {}
