import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus'
import { HealthService } from './health.service'

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check application health' })
  @ApiResponse({ status: 200, description: 'Health check successful' })
  @ApiResponse({ status: 503, description: 'Health check failed' })
  @HealthCheck()
  check() {
    const checks = [
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () => this.disk.checkStorage('storage', { path: '/', threshold: 0.9 }),
      () => this.healthService.checkRedis(),
      () => this.healthService.checkRabbitMQ(),
    ]

    // Only add database check if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      checks.unshift(() => this.db.pingCheck('database'))
    }

    return this.health.check(checks)
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check if application is ready' })
  @ApiResponse({ status: 200, description: 'Application is ready' })
  @ApiResponse({ status: 503, description: 'Application is not ready' })
  @HealthCheck()
  readiness() {
    const checks = [() => this.healthService.checkRedis()]

    // Only add database check if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      checks.unshift(() => this.db.pingCheck('database'))
    }

    return this.health.check(checks)
  }

  @Get('live')
  @ApiOperation({ summary: 'Check if application is alive' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  alive() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    }
  }
}
