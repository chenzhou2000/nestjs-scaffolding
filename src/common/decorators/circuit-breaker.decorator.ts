import { SetMetadata } from '@nestjs/common'
import { CircuitBreakerConfig } from '../circuit-breaker/circuit-breaker'

export const CIRCUIT_BREAKER_KEY = 'circuit-breaker'

/**
 * Decorator to apply circuit breaker protection to a method
 */
export const UseCircuitBreaker = (
  serviceName: string,
  config?: Partial<CircuitBreakerConfig>
) => SetMetadata(CIRCUIT_BREAKER_KEY, { serviceName, config })

/**
 * Decorator for database operations
 */
export const DatabaseCircuitBreaker = (config?: Partial<CircuitBreakerConfig>) =>
  UseCircuitBreaker('database', {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringPeriod: 60000,
    expectedErrorRate: 0.1,
    ...config,
  })

/**
 * Decorator for Redis operations
 */
export const RedisCircuitBreaker = (config?: Partial<CircuitBreakerConfig>) =>
  UseCircuitBreaker('redis', {
    failureThreshold: 3,
    recoveryTimeout: 15000,
    monitoringPeriod: 30000,
    expectedErrorRate: 0.15,
    ...config,
  })

/**
 * Decorator for RabbitMQ operations
 */
export const RabbitMQCircuitBreaker = (config?: Partial<CircuitBreakerConfig>) =>
  UseCircuitBreaker('rabbitmq', {
    failureThreshold: 3,
    recoveryTimeout: 20000,
    monitoringPeriod: 45000,
    expectedErrorRate: 0.1,
    ...config,
  })

/**
 * Decorator for gRPC operations
 */
export const GrpcCircuitBreaker = (serviceName: string, config?: Partial<CircuitBreakerConfig>) =>
  UseCircuitBreaker(`grpc-${serviceName}`, {
    failureThreshold: 4,
    recoveryTimeout: 25000,
    monitoringPeriod: 60000,
    expectedErrorRate: 0.12,
    ...config,
  })