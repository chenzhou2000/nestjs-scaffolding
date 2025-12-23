import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { CacheService } from './cache.service'
import { SessionService } from './session.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { UserRole } from '../../entities/user.entity'

@Controller('cache')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CacheController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly sessionService: SessionService,
  ) {}

  @Get('stats')
  @Roles(UserRole.ADMIN)
  async getCacheStats() {
    const sessionStats = await this.sessionService.getSessionStats()
    
    return {
      message: 'Cache statistics retrieved successfully',
      data: {
        sessions: sessionStats,
        timestamp: new Date().toISOString(),
      },
    }
  }

  @Delete('flush')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async flushCache() {
    await this.cacheService.flush()
    return {
      message: 'Cache flushed successfully',
    }
  }

  @Delete('key/:key')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteKey(@Param('key') key: string) {
    await this.cacheService.del(key)
    return {
      message: `Cache key '${key}' deleted successfully`,
    }
  }

  @Get('key/:key/exists')
  @Roles(UserRole.ADMIN)
  async checkKeyExists(@Param('key') key: string) {
    const exists = await this.cacheService.exists(key)
    return {
      message: 'Key existence checked',
      data: {
        key,
        exists,
      },
    }
  }

  @Delete('sessions/cleanup')
  @Roles(UserRole.ADMIN)
  async cleanupSessions() {
    const cleanedCount = await this.sessionService.cleanupExpiredSessions()
    return {
      message: 'Session cleanup completed',
      data: {
        cleanedSessions: cleanedCount,
      },
    }
  }
}