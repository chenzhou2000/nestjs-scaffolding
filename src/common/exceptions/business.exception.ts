import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * Business logic exception for domain-specific errors
 */
export class BusinessException extends HttpException {
  constructor(message: string, code?: string) {
    super(
      {
        message,
        error: 'Business Logic Error',
        code: code || 'BUSINESS_ERROR',
      },
      HttpStatus.BAD_REQUEST,
    )
  }
}

/**
 * Resource not found exception
 */
export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`
    
    super(
      {
        message,
        error: 'Resource Not Found',
        code: 'RESOURCE_NOT_FOUND',
        resource,
        identifier,
      },
      HttpStatus.NOT_FOUND,
    )
  }
}

/**
 * Resource conflict exception (e.g., duplicate entries)
 */
export class ResourceConflictException extends HttpException {
  constructor(resource: string, field?: string, value?: string) {
    const message = field && value
      ? `${resource} with ${field} '${value}' already exists`
      : `${resource} already exists`
    
    super(
      {
        message,
        error: 'Resource Conflict',
        code: 'RESOURCE_CONFLICT',
        resource,
        field,
        value,
      },
      HttpStatus.CONFLICT,
    )
  }
}

/**
 * Invalid operation exception
 */
export class InvalidOperationException extends HttpException {
  constructor(operation: string, reason?: string) {
    const message = reason
      ? `Cannot perform operation '${operation}': ${reason}`
      : `Invalid operation: ${operation}`
    
    super(
      {
        message,
        error: 'Invalid Operation',
        code: 'INVALID_OPERATION',
        operation,
        reason,
      },
      HttpStatus.BAD_REQUEST,
    )
  }
}