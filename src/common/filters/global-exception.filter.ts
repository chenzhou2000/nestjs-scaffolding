import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { QueryFailedError, EntityNotFoundError, TypeORMError } from 'typeorm'
import { LoggingService } from '../../modules/logging/logging.service'
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service'
import {
  BusinessException,
  ResourceNotFoundException,
  ResourceConflictException,
  InvalidOperationException,
  ExternalServiceException,
  DatabaseException,
  RedisException,
  RabbitMQException,
  GrpcServiceException,
  ValidationException,
  FileValidationException,
  AuthenticationException,
  AuthorizationException,
} from '../exceptions'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(LoggingService) private readonly loggingService: LoggingService,
    @Inject(CircuitBreakerService) private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const errorInfo = this.processException(exception)
    
    const errorResponse = {
      statusCode: errorInfo.status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorInfo.message,
      error: errorInfo.error,
      code: errorInfo.code,
      ...(errorInfo.details && { details: errorInfo.details }),
      ...(errorInfo.context && { context: errorInfo.context }),
      ...(process.env.NODE_ENV === 'development' && {
        stack: (exception as Error).stack,
      }),
    }

    // Log error with detailed context using LoggingService
    const userId = (request as any).user?.id
    this.loggingService.logError(
      exception as Error,
      'GlobalExceptionFilter',
      request,
      userId,
    )

    // Log additional error context separately
    this.loggingService.log('error', 'Exception Details', {
      errorCode: errorInfo.code,
      errorType: errorInfo.error,
      isRetryable: errorInfo.isRetryable,
      circuitBreakerStatus: errorInfo.circuitBreakerStatus,
    }, 'GlobalExceptionFilter')

    // Set appropriate headers for different error types
    if (errorInfo.isRetryable) {
      response.setHeader('Retry-After', '30') // Suggest retry after 30 seconds
    }

    if (errorInfo.status === HttpStatus.TOO_MANY_REQUESTS) {
      response.setHeader('X-RateLimit-Reset', Date.now() + 60000) // Reset after 1 minute
    }

    response.status(errorInfo.status).json(errorResponse)
  }

  private processException(exception: unknown): ErrorInfo {
    // Handle custom business exceptions
    if (exception instanceof BusinessException ||
        exception instanceof ResourceNotFoundException ||
        exception instanceof ResourceConflictException ||
        exception instanceof InvalidOperationException) {
      return this.handleBusinessException(exception)
    }

    // Handle external service exceptions
    if (exception instanceof ExternalServiceException) {
      return this.handleExternalServiceException(exception)
    }

    // Handle validation exceptions
    if (exception instanceof ValidationException ||
        exception instanceof FileValidationException) {
      return this.handleValidationException(exception)
    }

    // Handle authentication/authorization exceptions
    if (exception instanceof AuthenticationException ||
        exception instanceof AuthorizationException) {
      return this.handleAuthException(exception)
    }

    // Handle TypeORM exceptions
    if (exception instanceof TypeORMError) {
      return this.handleTypeORMException(exception)
    }

    // Handle standard HTTP exceptions
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception)
    }

    // Handle system errors
    if (exception instanceof Error) {
      return this.handleSystemError(exception)
    }

    // Handle unknown exceptions
    return this.handleUnknownException(exception)
  }

  private handleBusinessException(exception: HttpException): ErrorInfo {
    const response = exception.getResponse() as any
    return {
      status: exception.getStatus(),
      message: response.message || exception.message,
      error: response.error || 'Business Error',
      code: response.code || 'BUSINESS_ERROR',
      details: response.details,
      context: {
        resource: response.resource,
        identifier: response.identifier,
        field: response.field,
        value: response.value,
        operation: response.operation,
        reason: response.reason,
      },
      isRetryable: false,
    }
  }

  private handleExternalServiceException(exception: ExternalServiceException): ErrorInfo {
    const response = exception.getResponse() as any
    const serviceName = response.service

    // Get circuit breaker status
    const circuitBreakerStatus = this.circuitBreakerService
      .getCircuitBreaker(serviceName)
      .getStatus()

    return {
      status: exception.getStatus(),
      message: response.message || exception.message,
      error: response.error || 'External Service Error',
      code: response.code || 'EXTERNAL_SERVICE_ERROR',
      details: response.details,
      context: {
        service: serviceName,
        operation: response.operation,
        isTemporary: response.isTemporary,
        originalError: response.originalError,
      },
      isRetryable: response.isTemporary,
      circuitBreakerStatus,
    }
  }

  private handleValidationException(exception: HttpException): ErrorInfo {
    const response = exception.getResponse() as any
    return {
      status: exception.getStatus(),
      message: response.message || exception.message,
      error: response.error || 'Validation Error',
      code: response.code || 'VALIDATION_ERROR',
      details: response.details,
      context: {
        reason: response.reason,
        allowedTypes: response.allowedTypes,
        maxSize: response.maxSize,
        actualSize: response.actualSize,
      },
      isRetryable: false,
    }
  }

  private handleAuthException(exception: HttpException): ErrorInfo {
    const response = exception.getResponse() as any
    return {
      status: exception.getStatus(),
      message: response.message || exception.message,
      error: response.error || 'Authentication Error',
      code: response.code || 'AUTH_ERROR',
      details: response.details,
      context: {
        resource: response.resource,
        action: response.action,
        userRole: response.userRole,
        requiredRole: response.requiredRole,
      },
      isRetryable: false,
    }
  }

  private handleTypeORMException(exception: TypeORMError): ErrorInfo {
    if (exception instanceof QueryFailedError) {
      // Handle database constraint violations, syntax errors, etc.
      const message = this.sanitizeDatabaseError(exception.message)
      return {
        status: HttpStatus.BAD_REQUEST,
        message,
        error: 'Database Error',
        code: 'DATABASE_QUERY_FAILED',
        details: {
          query: exception.query,
          parameters: exception.parameters,
        },
        isRetryable: false,
      }
    }

    if (exception instanceof EntityNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Entity not found',
        error: 'Entity Not Found',
        code: 'ENTITY_NOT_FOUND',
        isRetryable: false,
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Database operation failed',
      error: 'Database Error',
      code: 'DATABASE_ERROR',
      isRetryable: true,
    }
  }

  private handleHttpException(exception: HttpException): ErrorInfo {
    const response = exception.getResponse()
    let message: string
    let details: any = null

    if (typeof response === 'string') {
      message = response
    } else if (typeof response === 'object') {
      message = (response as any).message || exception.message
      details = (response as any).details || null
    } else {
      message = exception.message
    }

    return {
      status: exception.getStatus(),
      message,
      error: exception.name,
      code: 'HTTP_EXCEPTION',
      details,
      isRetryable: exception.getStatus() >= 500,
    }
  }

  private handleSystemError(exception: Error): ErrorInfo {
    // Categorize system errors
    if (exception.message.includes('ECONNREFUSED') ||
        exception.message.includes('ETIMEDOUT') ||
        exception.message.includes('ENOTFOUND')) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'External service temporarily unavailable',
        error: 'Connection Error',
        code: 'CONNECTION_ERROR',
        isRetryable: true,
      }
    }

    if (exception.message.includes('EMFILE') ||
        exception.message.includes('ENFILE')) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        message: 'System resource exhausted',
        error: 'Resource Error',
        code: 'RESOURCE_EXHAUSTED',
        isRetryable: true,
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'System Error',
      code: 'SYSTEM_ERROR',
      isRetryable: false,
    }
  }

  private handleUnknownException(exception: unknown): ErrorInfo {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      error: 'Unknown Error',
      code: 'UNKNOWN_ERROR',
      isRetryable: false,
    }
  }

  private sanitizeDatabaseError(message: string): string {
    // Remove sensitive information from database error messages
    return message
      .replace(/password[^']*'[^']*'/gi, "password='***'")
      .replace(/pwd[^']*'[^']*'/gi, "pwd='***'")
      .replace(/token[^']*'[^']*'/gi, "token='***'")
  }
}

interface ErrorInfo {
  status: number
  message: string
  error: string
  code: string
  details?: any
  context?: any
  isRetryable: boolean
  circuitBreakerStatus?: any
}
