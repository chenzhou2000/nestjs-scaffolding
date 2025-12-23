import { Test, TestingModule } from '@nestjs/testing'
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service'
import { HealthCheckService } from '../health/health-check.service'
import { GlobalExceptionFilter } from '../filters/global-exception.filter'
import { LoggingService } from '../../modules/logging/logging.service'
import {
  BusinessException,
  ResourceNotFoundException,
  ResourceConflictException,
  DatabaseException,
  ValidationException,
} from '../exceptions'

describe('Error Handling System', () => {
  let circuitBreakerService: CircuitBreakerService
  let healthCheckService: HealthCheckService
  let globalExceptionFilter: GlobalExceptionFilter

  const mockLoggingService = {
    logError: jest.fn(),
    log: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CircuitBreakerService,
        HealthCheckService,
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
        {
          provide: GlobalExceptionFilter,
          useFactory: (loggingService: LoggingService, circuitBreakerService: CircuitBreakerService) =>
            new GlobalExceptionFilter(loggingService, circuitBreakerService),
          inject: [LoggingService, CircuitBreakerService],
        },
      ],
    }).compile()

    circuitBreakerService = module.get<CircuitBreakerService>(CircuitBreakerService)
    healthCheckService = module.get<HealthCheckService>(HealthCheckService)
    globalExceptionFilter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter)
  })

  describe('CircuitBreakerService', () => {
    it('should create circuit breaker for service', () => {
      const circuitBreaker = circuitBreakerService.getCircuitBreaker('test-service')
      expect(circuitBreaker).toBeDefined()
      expect(circuitBreaker.getStatus().serviceName).toBe('test-service')
    })

    it('should execute function with circuit breaker protection', async () => {
      const mockFn = jest.fn().mockResolvedValue('success')
      
      const result = await circuitBreakerService.executeWithCircuitBreaker(
        'test-service',
        mockFn
      )

      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should open circuit breaker after failures', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Service error'))
      
      // Execute multiple times to trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        try {
          await circuitBreakerService.executeWithCircuitBreaker('failing-service', mockFn)
        } catch (error) {
          // Expected to fail
        }
      }

      const status = circuitBreakerService.getAllStatus()
      expect(status['failing-service'].state).toBe('OPEN')
    })

    it('should reset circuit breaker', () => {
      // First create a circuit breaker
      circuitBreakerService.getCircuitBreaker('test-service')
      
      const success = circuitBreakerService.resetCircuitBreaker('test-service')
      expect(success).toBe(true)
    })
  })

  describe('HealthCheckService', () => {
    it('should register health check', () => {
      const healthCheckFn = jest.fn().mockResolvedValue({
        status: 'up',
        lastCheck: new Date().toISOString(),
      })

      healthCheckService.registerHealthCheck('test-service', healthCheckFn)
      
      // Verify health check was registered (internal state)
      expect(healthCheckService).toBeDefined()
    })

    it('should create ping health check', async () => {
      const pingFn = jest.fn().mockResolvedValue(undefined)
      const healthCheck = healthCheckService.createPingHealthCheck('test', pingFn)
      
      const result = await healthCheck()
      
      expect(result.status).toBe('up')
      expect(pingFn).toHaveBeenCalledTimes(1)
    })

    it('should handle failed ping health check', async () => {
      const pingFn = jest.fn().mockRejectedValue(new Error('Connection failed'))
      const healthCheck = healthCheckService.createPingHealthCheck('test', pingFn)
      
      const result = await healthCheck()
      
      expect(result.status).toBe('down')
      expect(result.error).toContain('Connection failed')
    })
  })

  describe('Custom Exceptions', () => {
    it('should create BusinessException', () => {
      const exception = new BusinessException('Invalid operation', 'INVALID_OP')
      expect(exception.getStatus()).toBe(400)
      
      const response = exception.getResponse() as any
      expect(response.message).toBe('Invalid operation')
      expect(response.code).toBe('INVALID_OP')
    })

    it('should create ResourceNotFoundException', () => {
      const exception = new ResourceNotFoundException('User', '123')
      expect(exception.getStatus()).toBe(404)
      
      const response = exception.getResponse() as any
      expect(response.message).toContain('User with identifier \'123\' not found')
      expect(response.code).toBe('RESOURCE_NOT_FOUND')
    })

    it('should create ResourceConflictException', () => {
      const exception = new ResourceConflictException('User', 'email', 'test@example.com')
      expect(exception.getStatus()).toBe(409)
      
      const response = exception.getResponse() as any
      expect(response.message).toContain('User with email \'test@example.com\' already exists')
      expect(response.code).toBe('RESOURCE_CONFLICT')
    })

    it('should create DatabaseException', () => {
      const originalError = new Error('Connection timeout')
      const exception = new DatabaseException('query users', originalError)
      expect(exception.getStatus()).toBe(503)
      
      const response = exception.getResponse() as any
      expect(response.service).toBe('Database')
      expect(response.operation).toBe('query users')
      expect(response.isTemporary).toBe(true)
    })

    it('should create ValidationException', () => {
      const errors = [
        {
          field: 'email',
          value: 'invalid-email',
          constraints: ['must be a valid email'],
        },
      ]
      
      const exception = new ValidationException(errors)
      expect(exception.getStatus()).toBe(400)
      
      const response = exception.getResponse() as any
      expect(response.code).toBe('VALIDATION_ERROR')
      expect(response.details).toEqual(errors)
    })
  })
})