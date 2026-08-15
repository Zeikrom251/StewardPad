import { Type } from 'class-transformer'
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator'
import type { IncidentStatus, IncidentType } from '@stewardpad/shared'
import { InvolvedCarDto } from './involved-car.dto.js'
import { PenaltyDto } from './penalty.dto.js'

const INCIDENT_TYPES: IncidentType[] = [
  'CONTACT',
  'OFF_TRACK',
  'TRACK_LIMITS',
  'UNSAFE_REJOIN',
  'UNSAFE_PIT_RELEASE',
  'BLOCKING',
  'DANGEROUS_DRIVING',
  'FALSE_START',
  'SPEEDING_PIT_LANE',
  'FCY_INFRINGEMENT',
  'OTHER',
]

const INCIDENT_STATUSES: IncidentStatus[] = [
  'NOTED',
  'UNDER_INVESTIGATION',
  'NO_FURTHER_ACTION',
  'PENALTY_APPLIED',
  'DISMISSED',
]

export class CreateIncidentDto {
  // A session clock never runs backwards, and a negative here would produce a
  // replayReference the steward cannot scrub to.
  @IsOptional()
  @IsNumber()
  @Min(0)
  eventSeconds?: number

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvolvedCarDto)
  cars?: InvolvedCarDto[]

  @IsOptional()
  @IsIn(INCIDENT_TYPES)
  type?: IncidentType

  @IsOptional()
  @IsIn(INCIDENT_STATUSES)
  status?: IncidentStatus

  @IsOptional()
  @IsString()
  summary?: string

  @IsOptional()
  @IsString()
  stewardNotes?: string

  @IsOptional()
  @IsString()
  decision?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => PenaltyDto)
  penalty?: PenaltyDto | null

  @IsOptional()
  @IsString()
  loggedBy?: string

  @IsOptional()
  @IsString()
  reviewedBy?: string | null
}
