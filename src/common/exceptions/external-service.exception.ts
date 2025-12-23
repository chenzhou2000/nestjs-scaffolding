import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * External service unavailable exception
 */
export class ExternalServiceException extends HttpException {
  constructor(
    service: string, 
    operation?: string, 
    originalError?: Error,
    isTemporary: boolean = true
  ) {
    const message = operation
      ? `${service} service is unavailable for operation: ${operation}`
      : `${service} service is unavailable`
    
    super(
      {
        message,
        error: 'External Service Error',
        code: 'EXTERNAL_SERVICE_ERROR',
        service,
        operation,
        isTemporary,
        originalError: originalError?.message,
      },
      isTemporary ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.BAD_GATEWAY,
    )
  }
}

/**
 * Database connection exception
 */
export class DatabaseException extends ExternalServiceException {
  constructor(operation?: string, originalError?: Error) {
    super('Database', operation, originalError, true)
    this.name = 'DatabaseException'
  }
}

/**
 * Redis connection exception
 */
export class RedisException extends ExternalServiceException {
  constructor(operation?: string, originalError?: Error) {
    super('Redis', operation, originalError, true)
    this.name = 'RedisException'
  }
}

/**
 * RabbitMQ connection exception
 */
export class RabbitMQException extends ExternalServiceException {
  constructor(operation?: string, originalError?: Error) {
    super('RabbitMQ', operation, originalError, true)
    this.name = 'RabbitMQException'
  }
}

/**
 * gRPC service exception
 */
export class GrpcServiceException extends ExternalServiceException {
  constructor(service: string, operation?: string, originalError?: Error) {
    super(`gRPC-${service}`, operation, originalError, true)
    this.name = 'GrpcServiceException'
  }
}