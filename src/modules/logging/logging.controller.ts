import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { LoggingService } from './logging.service'
import { LogQueryDto } from './dto/log-query.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../../entities/user.entity'

@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN) // Only admin users can access logs
export class LoggingController {
  constructor(private readonly loggingService: LoggingService) {}

  /**
   * Query logs with filtering options
   */
  @Get()
  async getLogs(@Query() queryDto: LogQueryDto) {
    const logs = await this.loggingService.queryLogs(queryDto)
    return {
      success: true,
      data: logs,
      count: logs.length,
      query: queryDto,
    }
  }

  /**
   * Get log statistics
   */
  @Get('stats')
  async getLogStats() {
    const stats = await this.loggingService.getLogStats()
    return {
      success: true,
      data: stats,
    }
  }

  /**
   * Get available log levels
   */
  @Get('levels')
  async getLogLevels() {
    return {
      success: true,
      data: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'],
    }
  }

  /**
   * Get available modules
   */
  @Get('modules')
  async getModules() {
    // This could be enhanced to dynamically discover modules from logs
    return {
      success: true,
      data: [
        'HTTP',
        'Auth',
        'Users',
        'Cache',
        'gRPC',
        'Files',
        'Queue',
        'Performance',
        'Database',
        'Unknown',
      ],
    }
  }
}