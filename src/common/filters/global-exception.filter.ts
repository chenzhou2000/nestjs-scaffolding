import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { LoggingService } from '../../modules/logging/logging.service'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(LoggingService) private readonly loggingService: LoggingService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let details: any = null

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message
        details = (exceptionResponse as any).details || null
      }
    } else if (exception instanceof Error) {
      message = exception.message
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(details && { details }),
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

    response.status(status).json(errorResponse)
  }
}
