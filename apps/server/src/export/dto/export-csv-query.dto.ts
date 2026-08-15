import { IsIn, IsOptional } from 'class-validator'
import type { CsvDelimiter, CsvVariant } from '@stewardpad/shared'

const VARIANTS: CsvVariant[] = ['full', 'drivers']
const DELIMITERS: CsvDelimiter[] = ['semicolon', 'comma']

export class ExportCsvQueryDto {
  @IsOptional()
  @IsIn(VARIANTS)
  variant?: CsvVariant

  @IsOptional()
  @IsIn(DELIMITERS)
  delimiter?: CsvDelimiter
}
