import { IsOptional, IsString, IsEnum, IsBoolean, IsNumber, Min } from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { UserRole } from '../entities/user.entity'

export class QueryUserDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 10

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

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
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}