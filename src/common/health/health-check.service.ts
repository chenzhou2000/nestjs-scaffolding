import { Injectable } from '@nestjs/common'
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service'
import { RetryUtil } from '../retry/retry.util'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: Record<string, ServiceHealth>
  timestamp: string
  uptime: number
}

export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded'
  responseTime?: number
  error?: string
  circuitBreakerState?: string
  lastCheck: string
}

@Injectable()
export class HealthCheckService {
  private readonly startTime = Date.now()
  private healthChecks = new Map<string, () => Promise<ServiceHealth>>()

  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  /**
   * Register a health check for a service
   */
  registerHealthCheck(
    serviceName: string,
    healthCheckFn: () => Promise<ServiceHealth>
  ): void {
    this.healthChecks.set(serviceName, healthCheckFn)
  }

  /**
   * Get overall system health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const services: Record<string, ServiceHealth> = {}
    const circuitBreakerStatuses = this.circuitBreakerService.getAllStatus()

    // Run all health checks
    for (const [serviceName, healthCheckFn] of this.healthChecks) {
      try {
        const startTime = Date.now()
        
        // Use circuit breaker for health checks
        const serviceHealth = await this.circuitBreakerService.executeWithCircuitBreaker(
          `health-${serviceName}`,
          async () => {
            return await RetryUtil.executeWithRetry(healthCheckFn, {
              maxAttempts: 2,
              baseDelay: 500,
              maxDelay: 2000,
            })
          },
          {
            failureThreshold: 3,
            recoveryTimeout: 10000, // 10 seconds for health checks
            monitoringPeriod: 30000,
            expectedErrorRate: 0.2,
          }
        )

        serviceHealth.responseTime = Date.now() - startTime
        serviceHealth.circuitBreakerState = circuitBreakerStatuses[`health-${serviceName}`]?.state
        services[serviceName] = serviceHealth

      } catch (error) {
        services[serviceName] = {
          status: 'down',
          error: error.message,
          circuitBreakerState: circuitBreakerStatuses[`health-${serviceName}`]?.state,
          lastCheck: new Date().toISOString(),
        }
      }
    }

    // Determine overall status
    const overallStatus = this.determineOverallStatus(services)

    return {
      status: overallStatus,
      services,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    }
  }

  /**
   * Get health status for a specific service
   */
  async getServiceHealth(serviceName: string): Promise<ServiceHealth | null> {
    const healthCheckFn = this.healthChecks.get(serviceName)
    if (!healthCheckFn) {
      return null
    }

    try {
      const startTime = Date.now()
      const health = await healthCheckFn()
      health.responseTime = Date.now() - startTime
      return health
    } catch (error) {
      return {
        status: 'down',
        error: error.message,
        lastCheck: new Date().toISOString(),
      }
    }
  }

  /**
   * Create a simple ping health check
   */
  createPingHealthCheck(
    serviceName: string,
    pingFn: () => Promise<void>
  ): () => Promise<ServiceHealth> {
    return async (): Promise<ServiceHealth> => {
      try {
        await pingFn()
        return {
          status: 'up',
          lastCheck: new Date().toISOString(),
        }
      } catch (error) {
        return {
          status: 'down',
          error: error.message,
          lastCheck: new Date().toISOString(),
        }
      }
    }
  }

  /**
   * Create a database health check
   */
  createDatabaseHealthCheck(
    queryFn: () => Promise<any>
  ): () => Promise<ServiceHealth> {
    return async (): Promise<ServiceHealth> => {
      try {
        await queryFn()
        return {
          status: 'up',
          lastCheck: new Date().toISOString(),
        }
      } catch (error) {
        return {
          status: 'down',
          error: `Database connection failed: ${error.message}`,
          lastCheck: new Date().toISOString(),
        }
      }
    }
  }

  /**
   * Create a Redis health check
   */
  createRedisHealthCheck(
    redisPingFn: () => Promise<string>
  ): () => Promise<ServiceHealth> {
    return async (): Promise<ServiceHealth> => {
      try {
        const result = await redisPingFn()
        return {
          status: result === 'PONG' ? 'up' : 'degraded',
          lastCheck: new Date().toISOString(),
        }
      } catch (error) {
        return {
          status: 'down',
          error: `Redis connection failed: ${error.message}`,
          lastCheck: new Date().toISOString(),
        }
      }
    }
  }

  private determineOverallStatus(services: Record<string, ServiceHealth>): 'healthy' | 'degraded' | 'unhealthy' {
    const serviceStatuses = Object.values(services)
    
    if (serviceStatuses.length === 0) {
      return 'healthy'
    }

    const downServices = serviceStatuses.filter(s => s.status === 'down').length
    const degradedServices = serviceStatuses.filter(s => s.status === 'degraded').length
    const totalServices = serviceStatuses.length

    // If more than 50% of services are down, system is unhealthy
    if (downServices / totalServices > 0.5) {
      return 'unhealthy'
    }

    // If any services are down or degraded, system is degraded
    if (downServices > 0 || degradedServices > 0) {
      return 'degraded'
    }

    return 'healthy'
  }
}