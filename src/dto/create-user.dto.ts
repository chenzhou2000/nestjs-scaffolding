import { IsEmail, IsString, IsOptional, IsEnum, IsBoolean, MinLength } from 'class-validator'
import { UserRole } from '../entities/user.entity'

export class CreateUserDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  password: string

  @IsString()
  firstName: string

  @IsString()
  lastName: string

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}