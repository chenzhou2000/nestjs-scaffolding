import { IsOptional, IsString, IsNumber, IsDateString, Min, Max } from 'class-validator'
import { Transform, Type } from 'class-transformer'

export class LogQueryDto {
  @IsOptional()
  @IsString()
  level?: string

  @IsOptional()
  @IsString()
  module?: string

  @IsOptional()
  @IsDateString()
  startDate?: string

  @IsOptional()
  @IsDateString()
  endDate?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number = 100

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0

  @IsOptional()
  @IsString()
  search?: string
}