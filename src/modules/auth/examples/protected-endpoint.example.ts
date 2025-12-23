import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { RolesGuard } from '../guards/roles.guard'
import { Roles } from '../decorators/roles.decorator'
import { CurrentUser } from '../decorators/current-user.decorator'
import { UserRole, User } from '../../../entities/user.entity'

/**
 * Example controller showing how to use authentication and authorization
 * This is for demonstration purposes only
 */
@Controller('example')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExampleController {
  
  // Any authenticated user can access this endpoint
  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return {
      message: 'This endpoint requires authentication',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    }
  }

  // Only admins can access this endpoint
  @Get('admin-only')
  @Roles(UserRole.ADMIN)
  adminOnlyEndpoint(@CurrentUser() user: User) {
    return {
      message: 'This endpoint is only accessible by admins',
      adminUser: user.email,
    }
  }

  // Admins and moderators can access this endpoint
  @Get('moderator-or-admin')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  moderatorOrAdminEndpoint(@CurrentUser() user: User) {
    return {
      message: 'This endpoint is accessible by admins and moderators',
      user: user.email,
      role: user.role,
    }
  }

  // Public endpoint (no guards applied)
  @Get('public')
  publicEndpoint() {
    return {
      message: 'This is a public endpoint, no authentication required',
    }
  }
}