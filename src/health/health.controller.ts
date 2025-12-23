import { Controller, Get, Param } from '@nestjs/common'
import {
  HealthCheckService,
  HealthCheck,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus'
import { HealthService } from './health.service'
import { CircuitBreakerService } from '../common/circuit-breaker/circuit-breaker.service'
import { HealthCheckService as CustomHealthCheckService } from '../common/health/health-check.service'

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private healthService: HealthService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly customHealthCheckService: CustomHealthCheckService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const checks = [
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () => this.disk.checkStorage('storage', { path: '/', threshold: 0.9 }),
      () => this.healthService.checkRedis(),
      () => this.healthService.checkRabbitMQ(),
    ]

    // 仅在非测试环境下添加数据库检查
    if (process.env.NODE_ENV !== 'test') {
      checks.unshift(() => this.db.pingCheck('database'))
    }

    return this.health.check(checks)
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    const checks = [() => this.healthService.checkRedis()]

    // 仅在非测试环境下添加数据库检查
    if (process.env.NODE_ENV !== 'test') {
      checks.unshift(() => this.db.pingCheck('database'))
    }

    return this.health.check(checks)
  }

  @Get('live')
  alive() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    }
  }

  @Get('detailed')
  async detailedCheck() {
    return this.customHealthCheckService.getHealthStatus()
  }

  @Get('circuit-breakers')
  getCircuitBreakerStatus() {
    return {
      timestamp: new Date().toISOString(),
      circuitBreakers: this.circuitBreakerService.getAllStatus(),
    }
  }

  @Get('circuit-breakers/:serviceName/reset')
  resetCircuitBreaker(@Param('serviceName') serviceName: string) {
    const success = this.circuitBreakerService.resetCircuitBreaker(serviceName)
    return {
      success,
      message: success 
        ? `Circuit breaker for ${serviceName} has been reset`
        : `Circuit breaker for ${serviceName} not found`,
      timestamp: new Date().toISOString(),
    }
  }
}
