import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import type { PenaltyType } from '@stewardpad/shared'

const PENALTY_TYPES: PenaltyType[] = [
  'WARNING',
  'REPRIMAND',
  'TIME_PENALTY',
  'DRIVE_THROUGH',
  'STOP_GO',
  'GRID_PENALTY_NEXT_RACE',
  'DISQUALIFICATION',
]

export class PenaltyDto {
  @IsIn(PENALTY_TYPES)
  type: PenaltyType = 'WARNING'

  @IsOptional()
  @IsInt()
  seconds: number | null = null

  @IsString()
  @IsNotEmpty()
  appliedTo = ''

  @IsBoolean()
  served = false

  @IsString()
  notes = ''
}
