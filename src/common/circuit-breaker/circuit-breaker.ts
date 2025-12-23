/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN' // Testing if service is back
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number    // Number of failures before opening
  recoveryTimeout: number     // Time to wait before trying again (ms)
  monitoringPeriod: number   // Time window for failure counting (ms)
  expectedErrorRate: number  // Expected error rate (0-1)
}

/**
 * Circuit breaker implementation for service degradation
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failureCount: number = 0
  private lastFailureTime: number = 0
  private nextAttemptTime: number = 0
  private successCount: number = 0

  constructor(
    private readonly serviceName: string,
    private readonly config: CircuitBreakerConfig
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error(`Circuit breaker is OPEN for ${this.serviceName}. Service temporarily unavailable.`)
      }
      // Transition to half-open to test the service
      this.state = CircuitBreakerState.HALF_OPEN
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0
    this.successCount++
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout
    }
  }

  /**
   * Get current circuit breaker status
   */
  getStatus() {
    return {
      serviceName: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      isAvailable: this.state !== CircuitBreakerState.OPEN || Date.now() >= this.nextAttemptTime
    }
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = 0
    this.nextAttemptTime = 0
  }

  /**
   * Force circuit breaker to open state
   */
  forceOpen(): void {
    this.state = CircuitBreakerState.OPEN
    this.nextAttemptTime = Date.now() + this.config.recoveryTimeout
  }
}