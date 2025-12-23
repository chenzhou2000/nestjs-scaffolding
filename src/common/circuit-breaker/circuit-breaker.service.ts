import { Injectable } from '@nestjs/common'
import { CircuitBreaker, CircuitBreakerConfig } from './circuit-breaker'

/**
 * Service to manage multiple circuit breakers
 */
@Injectable()
export class CircuitBreakerService {
  private circuitBreakers = new Map<string, CircuitBreaker>()

  /**
   * Get or create a circuit breaker for a service
   */
  getCircuitBreaker(serviceName: string, config?: CircuitBreakerConfig): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      const defaultConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        recoveryTimeout: 30000, // 30 seconds
        monitoringPeriod: 60000, // 1 minute
        expectedErrorRate: 0.1   // 10%
      }

      const circuitBreaker = new CircuitBreaker(
        serviceName,
        config || defaultConfig
      )
      
      this.circuitBreakers.set(serviceName, circuitBreaker)
    }

    return this.circuitBreakers.get(serviceName)!
  }

  /**
   * Execute function with circuit breaker protection
   */
  async executeWithCircuitBreaker<T>(
    serviceName: string,
    fn: () => Promise<T>,
    config?: CircuitBreakerConfig
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(serviceName, config)
    return circuitBreaker.execute(fn)
  }

  /**
   * Get status of all circuit breakers
   */
  getAllStatus() {
    const status: Record<string, any> = {}
    
    for (const [serviceName, circuitBreaker] of this.circuitBreakers) {
      status[serviceName] = circuitBreaker.getStatus()
    }
    
    return status
  }

  /**
   * Reset a specific circuit breaker
   */
  resetCircuitBreaker(serviceName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(serviceName)
    if (circuitBreaker) {
      circuitBreaker.reset()
      return true
    }
    return false
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    for (const circuitBreaker of this.circuitBreakers.values()) {
      circuitBreaker.reset()
    }
  }

  /**
   * Force open a circuit breaker (for testing or maintenance)
   */
  forceOpenCircuitBreaker(serviceName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(serviceName)
    if (circuitBreaker) {
      circuitBreaker.forceOpen()
      return true
    }
    return false
  }
}