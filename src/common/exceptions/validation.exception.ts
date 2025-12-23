import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * Custom validation exception with detailed field errors
 */
export class ValidationException extends HttpException {
  constructor(errors: ValidationError[]) {
    super(
      {
        message: 'Validation failed',
        error: 'Validation Error',
        code: 'VALIDATION_ERROR',
        details: errors,
      },
      HttpStatus.BAD_REQUEST,
    )
  }
}

/**
 * Individual validation error for a field
 */
export interface ValidationError {
  field: string
  value: any
  constraints: string[]
  children?: ValidationError[]
}

/**
 * File validation exception
 */
export class FileValidationException extends HttpException {
  constructor(
    reason: string,
    allowedTypes?: string[],
    maxSize?: number,
    actualSize?: number
  ) {
    super(
      {
        message: `File validation failed: ${reason}`,
        error: 'File Validation Error',
        code: 'FILE_VALIDATION_ERROR',
        reason,
        allowedTypes,
        maxSize,
        actualSize,
      },
      HttpStatus.BAD_REQUEST,
    )
  }
}

/**
 * Authentication validation exception
 */
export class AuthenticationException extends HttpException {
  constructor(reason: string = 'Invalid credentials') {
    super(
      {
        message: reason,
        error: 'Authentication Error',
        code: 'AUTHENTICATION_ERROR',
      },
      HttpStatus.UNAUTHORIZED,
    )
  }
}

/**
 * Authorization exception for insufficient permissions
 */
export class AuthorizationException extends HttpException {
  constructor(
    resource: string,
    action: string,
    userRole?: string,
    requiredRole?: string
  ) {
    const message = `Access denied: insufficient permissions to ${action} ${resource}`
    
    super(
      {
        message,
        error: 'Authorization Error',
        code: 'AUTHORIZATION_ERROR',
        resource,
        action,
        userRole,
        requiredRole,
      },
      HttpStatus.FORBIDDEN,
    )
  }
}