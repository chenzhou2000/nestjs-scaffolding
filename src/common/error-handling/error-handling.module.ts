import { Module, Global } from '@nestjs/common'
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service'
import { HealthCheckService } from '../health/health-check.service'
import { GlobalExceptionFilter } from '../filters/global-exception.filter'

@Global()
@Module({
  providers: [
    CircuitBreakerService,
    HealthCheckService,
    GlobalExceptionFilter,
  ],
  exports: [
    CircuitBreakerService,
    HealthCheckService,
    GlobalExceptionFilter,
  ],
})
export class ErrorHandlingModule {}