import { IsEmail, IsString, IsOptional, IsEnum, IsBoolean, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { UserRole } from '../entities/user.entity'

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'password123', description: 'User password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string

  @ApiProperty({ example: 'John', description: 'User first name' })
  @IsString()
  firstName: string

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  @IsString()
  lastName: string

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.USER, description: 'User role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @ApiPropertyOptional({ example: true, description: 'Whether user is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}