import { ApiProperty } from '@nestjs/swagger'
import { UserRole } from '../entities/user.entity'
import { Exclude } from 'class-transformer'

export class UserResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string

  @ApiProperty({ example: 'user@example.com' })
  email: string

  @Exclude()
  password: string

  @ApiProperty({ example: 'John' })
  firstName: string

  @ApiProperty({ example: 'Doe' })
  lastName: string

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role: UserRole

  @ApiProperty({ example: true })
  isActive: boolean

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  createdAt: Date

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  updatedAt: Date
}