import { ArrayMinSize, IsArray, IsOptional, IsUUID } from 'class-validator'

export class MergeIncidentsDto {
  @IsArray()
  @ArrayMinSize(2)
  @IsUUID('4', { each: true })
  incidentIds!: string[]

  @IsOptional()
  @IsUUID('4')
  primaryId?: string
}
