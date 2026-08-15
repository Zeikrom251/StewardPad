import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class UpdateConfigDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  lookbackSeconds?: number

  @IsOptional()
  @IsString()
  @MaxLength(80)
  stewardName?: string

  /** Absolute path to write archive JSON files. Empty string resets to default. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  archiveDir?: string
}
