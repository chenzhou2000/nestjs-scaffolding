import { IsOptional, IsString, IsEnum, IsBoolean, IsNumber, Min } from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { UserRole } from '../entities/user.entity'

export class QueryUserDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ example: 10, description: 'Items per page', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10

  @ApiPropertyOptional({ example: 'john', description: 'Search by name or email' })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({ enum: UserRole, description: 'Filter by role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @ApiPropertyOptional({ example: true, description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  })
  @IsBoolean()
  isActive?: boolean
}

export class PaginatedResult<T> {
  @ApiPropertyOptional({ description: 'Array of items' })
  data: T[]

  @ApiPropertyOptional({ example: 100, description: 'Total number of items' })
  total: number

  @ApiPropertyOptional({ example: 1, description: 'Current page' })
  page: number

  @ApiPropertyOptional({ example: 10, description: 'Items per page' })
  limit: number

  @ApiPropertyOptional({ example: 10, description: 'Total number of pages' })
  totalPages: number
}