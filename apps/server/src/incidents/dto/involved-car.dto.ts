import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import type { InvolvedRole } from '@stewardpad/shared'

const ROLES: InvolvedRole[] = ['REPORTED', 'REPORTER', 'INVOLVED']

export class InvolvedCarDto {
  @IsString()
  @IsNotEmpty()
  carNumber = ''

  @IsString()
  @IsNotEmpty()
  driverName = ''

  // Optional (not @IsNotEmpty): older clients don't send it yet, and '' is a
  // valid "unknown" default rather than a rejected request.
  @IsString()
  carClass = ''

  @IsOptional()
  @IsInt()
  lapAtIncident: number | null = null

  @IsIn(ROLES)
  role: InvolvedRole = 'INVOLVED'
}
