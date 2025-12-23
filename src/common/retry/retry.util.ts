/**
 * Retry configuration options
 */
export interface RetryConfig {
  maxAttempts: number
  baseDelay: number        // Base delay in milliseconds
  maxDelay: number         // Maximum delay in milliseconds
  backoffMultiplier: number // Exponential backoff multiplier
  jitter: boolean          // Add random jitter to prevent thundering herd
  retryCondition?: (error: Error) => boolean // Custom condition to determine if retry should happen
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryCondition: (error: Error) => {
    // Retry on network errors, timeouts, and temporary service errors
    return error.message.includes('ECONNREFUSED') ||
           error.message.includes('ETIMEDOUT') ||
           error.message.includes('ENOTFOUND') ||
           error.message.includes('Service Unavailable') ||
           error.message.includes('Internal Server Error')
  }
}

/**
 * Retry utility with exponential backoff and jitter
 */
export class RetryUtil {
  /**
   * Execute a function with retry logic
   */
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
    let lastError: Error
    
    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry if this is the last attempt
        if (attempt === finalConfig.maxAttempts) {
          break
        }
        
        // Check if we should retry this error
        if (finalConfig.retryCondition && !finalConfig.retryCondition(lastError)) {
          break
        }
        
        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt, finalConfig)
        
        // Wait before retrying
        await this.sleep(delay)
      }
    }
    
    throw lastError
  }

  /**
   * Calculate delay with exponential backoff and optional jitter
   */
  private static calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff: baseDelay * (backoffMultiplier ^ (attempt - 1))
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)
    
    // Cap at maximum delay
    delay = Math.min(delay, config.maxDelay)
    
    // Add jitter to prevent thundering herd problem
    if (config.jitter) {
      // Add random jitter of ±25%
      const jitterRange = delay * 0.25
      const jitter = (Math.random() - 0.5) * 2 * jitterRange
      delay += jitter
    }
    
    return Math.max(0, Math.floor(delay))
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Create a retry wrapper function
   */
  static createRetryWrapper<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    config: Partial<RetryConfig> = {}
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      return this.executeWithRetry(() => fn(...args), config)
    }
  }
}