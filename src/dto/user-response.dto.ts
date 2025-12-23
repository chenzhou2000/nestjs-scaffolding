import { UserRole } from '../entities/user.entity'
import { Exclude } from 'class-transformer'

export class UserResponseDto {
  id: string
  email: string
  
  @Exclude()
  password: string
  
  firstName: string
  lastName: string
  role: UserRole
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}