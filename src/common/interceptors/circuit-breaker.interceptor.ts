import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service'
import { CIRCUIT_BREAKER_KEY } from '../decorators/circuit-breaker.decorator'

@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly circuitBreakerService: CircuitBreakerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const circuitBreakerMetadata = this.reflector.get(
      CIRCUIT_BREAKER_KEY,
      context.getHandler(),
    )

    if (!circuitBreakerMetadata) {
      return next.handle()
    }

    const { serviceName, config } = circuitBreakerMetadata

    return new Observable((observer) => {
      this.circuitBreakerService
        .executeWithCircuitBreaker(
          serviceName,
          () => next.handle().toPromise(),
          config,
        )
        .then((result) => {
          observer.next(result)
          observer.complete()
        })
        .catch((error) => {
          observer.error(error)
        })
    })
  }
}