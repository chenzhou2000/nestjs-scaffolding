import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { LoggingService } from '../../modules/logging/logging.service'
import { PERFORMANCE_KEY } from '../decorators/performance.decorator'

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(LoggingService) private readonly loggingService: LoggingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const operationName = this.reflector.get<string>(
      PERFORMANCE_KEY,
      context.getHandler(),
    )

    if (!operationName) {
      return next.handle()
    }

    const startTime = Date.now()
    const request = context.switchToHttp().getRequest()
    const userId = request?.user?.id

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime
        const className = context.getClass().name
        const methodName = context.getHandler().name
        
        this.loggingService.logPerformance(
          operationName || `${className}.${methodName}`,
          duration,
          {
            className,
            methodName,
            args: context.getArgs(),
          },
          userId,
        )
      }),
    )
  }
}