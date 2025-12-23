import { IsEmail, IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator'
import { UserRole } from '../entities/user.entity'

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  firstName?: string

  @IsOptional()
  @IsString()
  lastName?: string

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}