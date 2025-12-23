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

@Controller('cache')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CacheController {
  constructor(
    private readonly cacheService: CacheService,
    private readonly sessionService: SessionService,
  ) {}

  @Get('stats')
  @Roles('admin')
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
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async flushCache() {
    await this.cacheService.flush()
    return {
      message: 'Cache flushed successfully',
    }
  }

  @Delete('key/:key')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteKey(@Param('key') key: string) {
    await this.cacheService.del(key)
    return {
      message: `Cache key '${key}' deleted successfully`,
    }
  }

  @Get('key/:key/exists')
  @Roles('admin')
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
  @Roles('admin')
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