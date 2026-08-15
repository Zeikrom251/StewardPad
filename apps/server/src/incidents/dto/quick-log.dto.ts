import { IsArray, IsOptional, IsString } from 'class-validator'

export class QuickLogDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  slotIds?: string[]

  @IsOptional()
  @IsString()
  loggedBy?: string
}
