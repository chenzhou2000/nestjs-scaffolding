import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common'
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service'
import { HealthCheckService } from '../health/health-check.service'
import { RetryUtil } from '../retry/retry.util'
import {
  BusinessException,
  ResourceNotFoundException,
  ResourceConflictException,
  DatabaseException,
  RedisException,
  ValidationException,
  AuthenticationException,
  AuthorizationException,
} from '../exceptions'
import { DatabaseCircuitBreaker, RedisCircuitBreaker } from '../decorators/circuit-breaker.decorator'

/**
 * Demo controller to showcase error handling and recovery mechanisms
 * This controller is for demonstration purposes only
 */
@Controller('demo/error-handling')
export class ErrorDemoController {
  constructor(
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly healthCheckService: HealthCheckService,
  ) {}

  @Get('business-error')
  throwBusinessError() {
    throw new BusinessException('This is a business logic error', 'DEMO_BUSINESS_ERROR')
  }

  @Get('resource-not-found/:id')
  throwResourceNotFound(@Param('id') id: string) {
    throw new ResourceNotFoundException('DemoResource', id)
  }

  @Get('resource-conflict')
  throwResourceConflict() {
    throw new ResourceConflictException('DemoResource', 'name', 'duplicate-name')
  }

  @Get('database-error')
  @DatabaseCircuitBreaker()
  throwDatabaseError() {
    throw new DatabaseException('demo operation', new Error('Connection timeout'))
  }

  @Get('redis-error')
  @RedisCircuitBreaker()
  throwRedisError() {
    throw new RedisException('demo cache operation', new Error('Redis connection failed'))
  }

  @Post('validation-error')
  throwValidationError(@Body() body: any) {
    const errors = [
      {
        field: 'email',
        value: body.email,
        constraints: ['must be a valid email address'],
      },
      {
        field: 'age',
        value: body.age,
        constraints: ['must be a positive number'],
      },
    ]
    throw new ValidationException(errors)
  }

  @Get('auth-error')
  throwAuthError() {
    throw new AuthenticationException('Invalid demo credentials')
  }

  @Get('authorization-error')
  throwAuthorizationError() {
    throw new AuthorizationException('DemoResource', 'read', 'user', 'admin')
  }

  @Get('circuit-breaker-demo')
  async demonstrateCircuitBreaker(@Query('fail') shouldFail: string) {
    const serviceName = 'demo-service'
    
    try {
      const result = await this.circuitBreakerService.executeWithCircuitBreaker(
        serviceName,
        async () => {
          if (shouldFail === 'true') {
            throw new Error('Simulated service failure')
          }
          return { message: 'Service call successful', timestamp: new Date().toISOString() }
        }
      )
      
      return {
        success: true,
        result,
        circuitBreakerStatus: this.circuitBreakerService.getCircuitBreaker(serviceName).getStatus(),
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        circuitBreakerStatus: this.circuitBreakerService.getCircuitBreaker(serviceName).getStatus(),
      }
    }
  }

  @Get('retry-demo')
  async demonstrateRetry(@Query('fail') shouldFail: string, @Query('attempts') maxAttempts: string) {
    let attemptCount = 0
    const maxAttemptsNum = parseInt(maxAttempts) || 3

    try {
      const result = await RetryUtil.executeWithRetry(
        async () => {
          attemptCount++
          if (shouldFail === 'true' && attemptCount < maxAttemptsNum) {
            throw new Error(`Attempt ${attemptCount} failed`)
          }
          return { 
            message: 'Operation successful', 
            attemptCount,
            timestamp: new Date().toISOString() 
          }
        },
        {
          maxAttempts: maxAttemptsNum,
          baseDelay: 500,
          maxDelay: 2000,
          backoffMultiplier: 2,
          jitter: true,
        }
      )

      return {
        success: true,
        result,
        totalAttempts: attemptCount,
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        totalAttempts: attemptCount,
      }
    }
  }

  @Get('health-status')
  async getHealthStatus() {
    return this.healthCheckService.getHealthStatus()
  }

  @Get('circuit-breaker-status')
  getCircuitBreakerStatus() {
    return {
      timestamp: new Date().toISOString(),
      circuitBreakers: this.circuitBreakerService.getAllStatus(),
    }
  }

  @Post('circuit-breaker/:serviceName/reset')
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

  @Get('system-error')
  throwSystemError() {
    // Simulate a system error
    throw new Error('ECONNREFUSED: Connection refused')
  }

  @Get('unknown-error')
  throwUnknownError() {
    // Simulate an unknown error type
    throw 'This is not an Error object'
  }
}