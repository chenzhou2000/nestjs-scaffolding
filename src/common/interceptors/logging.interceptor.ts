import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { Request, Response } from 'express'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp()
    const request = ctx.getRequest<Request>()
    const response = ctx.getResponse<Response>()
    const { method, url, ip } = request
    const userAgent = request.get('User-Agent') || ''

    const now = Date.now()

    return next.handle().pipe(
      tap(() => {
        const { statusCode } = response
        const contentLength = response.get('content-length')
        const responseTime = Date.now() - now

        console.log(
          `${method} ${url} ${statusCode} ${contentLength || 0}b - ${responseTime}ms - ${ip} ${userAgent}`,
        )
      }),
    )
  }
}
