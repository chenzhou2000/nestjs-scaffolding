import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap, catchError } from 'rxjs/operators'
import { Request, Response } from 'express'
import { LoggingService } from '../../modules/logging/logging.service'
import { throwError } from 'rxjs'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(LoggingService) private readonly loggingService: LoggingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp()
    const request = ctx.getRequest<Request>()
    const response = ctx.getResponse<Response>()
    const now = Date.now()

    // Extract user ID from request if available
    const userId = (request as any).user?.id

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now
        
        // Log HTTP request
        this.loggingService.logHttpRequest(request, response, responseTime, userId)
        
        // Log performance if response time is high
        if (responseTime > 1000) {
          this.loggingService.logPerformance(
            `Slow HTTP Request: ${request.method} ${request.url}`,
            responseTime,
            {
              statusCode: response.statusCode,
              url: request.url,
              method: request.method,
            },
            userId,
          )
        }
      }),
      catchError((error) => {
        const responseTime = Date.now() - now
        
        // Log error with request context
        this.loggingService.logError(error, 'HTTP Request', request, userId)
        
        return throwError(() => error)
      }),
    )
  }
}
