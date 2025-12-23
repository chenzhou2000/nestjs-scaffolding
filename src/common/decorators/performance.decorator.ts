import { SetMetadata } from '@nestjs/common'

export const PERFORMANCE_KEY = 'performance'

/**
 * Decorator to mark methods for performance monitoring
 */
export const Performance = (operationName?: string) =>
  SetMetadata(PERFORMANCE_KEY, operationName)