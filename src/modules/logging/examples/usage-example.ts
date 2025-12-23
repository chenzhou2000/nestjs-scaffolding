import { Injectable } from '@nestjs/common'
import { LoggingService } from '../logging.service'
import { Performance } from '../../../common/decorators/performance.decorator'

/**
 * Example service demonstrating logging system usage
 */
@Injectable()
export class ExampleService {
  constructor(private readonly loggingService: LoggingService) {}

  /**
   * Example of basic logging
   */
  async basicLoggingExample() {
    // Info logging
    this.loggingService.log('info', 'User operation started', {
      operation: 'create',
      userId: 'user123',
    }, 'ExampleService')

    // Warning logging
    this.loggingService.log('warn', 'Deprecated API used', {
      endpoint: '/api/old-endpoint',
      userId: 'user123',
    }, 'ExampleService')

    try {
      // Simulate some operation
      await this.simulateOperation()
    } catch (error) {
      // Error logging with context
      this.loggingService.logError(error, 'ExampleService.basicLoggingExample')
    }
  }

  /**
   * Example of performance monitoring
   */
  @Performance('Database Operation')
  async performanceExample() {
    // Simulate database operation
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Manual performance logging
    const startTime = Date.now()
    await this.simulateComplexOperation()
    const duration = Date.now() - startTime
    
    this.loggingService.logPerformance(
      'Complex Operation',
      duration,
      {
        complexity: 'high',
        cacheHit: false,
      },
      'user123'
    )
  }

  /**
   * Example of error logging with request context
   */
  async errorLoggingExample(request: any) {
    try {
      throw new Error('Simulated error for demonstration')
    } catch (error) {
      // Log error with request context and user ID
      this.loggingService.logError(
        error,
        'ExampleService.errorLoggingExample',
        request,
        request.user?.id
      )
      throw error
    }
  }

  private async simulateOperation() {
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  private async simulateComplexOperation() {
    // Simulate complex work
    await new Promise(resolve => setTimeout(resolve, 200))
  }
}