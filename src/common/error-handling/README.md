# Global Exception Handling and Error Recovery System

This module provides comprehensive error handling, service degradation, and circuit breaker mechanisms for the NestJS Learning API.

## Features

### 1. Custom Exception Classes

#### Business Exceptions
- `BusinessException` - Domain-specific business logic errors
- `ResourceNotFoundException` - Resource not found errors
- `ResourceConflictException` - Resource conflict errors (e.g., duplicates)
- `InvalidOperationException` - Invalid operation errors

#### External Service Exceptions
- `ExternalServiceException` - Base class for external service errors
- `DatabaseException` - Database connection/operation errors
- `RedisException` - Redis cache operation errors
- `RabbitMQException` - Message queue operation errors
- `GrpcServiceException` - gRPC service communication errors

#### Validation Exceptions
- `ValidationException` - Input validation errors with detailed field information
- `FileValidationException` - File upload validation errors
- `AuthenticationException` - Authentication failures
- `AuthorizationException` - Authorization/permission errors

### 2. Circuit Breaker Pattern

The circuit breaker pattern prevents cascading failures by monitoring service health and temporarily blocking requests to failing services.

#### States
- **CLOSED** - Normal operation, requests pass through
- **OPEN** - Service is failing, requests fail fast
- **HALF_OPEN** - Testing if service has recovered

#### Configuration
```typescript
interface CircuitBreakerConfig {
  failureThreshold: number    // Failures before opening (default: 5)
  recoveryTimeout: number     // Time before retry (default: 30s)
  monitoringPeriod: number   // Monitoring window (default: 60s)
  expectedErrorRate: number  // Expected error rate (default: 0.1)
}
```

#### Usage with Decorators
```typescript
@DatabaseCircuitBreaker()
async databaseOperation() {
  // Database operation with circuit breaker protection
}

@RedisCircuitBreaker()
async cacheOperation() {
  // Cache operation with circuit breaker protection
}

@UseCircuitBreaker('custom-service', { failureThreshold: 3 })
async customServiceCall() {
  // Custom service call with circuit breaker
}
```

#### Manual Usage
```typescript
constructor(private circuitBreakerService: CircuitBreakerService) {}

async someOperation() {
  return this.circuitBreakerService.executeWithCircuitBreaker(
    'service-name',
    async () => {
      // Your operation here
      return await externalServiceCall()
    }
  )
}
```

### 3. Retry Mechanism

Automatic retry with exponential backoff and jitter to handle transient failures.

#### Configuration
```typescript
interface RetryConfig {
  maxAttempts: number         // Maximum retry attempts (default: 3)
  baseDelay: number          // Base delay in ms (default: 1000)
  maxDelay: number           // Maximum delay in ms (default: 30000)
  backoffMultiplier: number  // Exponential multiplier (default: 2)
  jitter: boolean            // Add random jitter (default: true)
  retryCondition?: (error: Error) => boolean // Custom retry condition
}
```

#### Usage
```typescript
import { RetryUtil } from '../retry/retry.util'

// Basic retry
const result = await RetryUtil.executeWithRetry(
  () => unreliableOperation(),
  { maxAttempts: 3, baseDelay: 1000 }
)

// Create retry wrapper
const retryableFunction = RetryUtil.createRetryWrapper(
  unreliableOperation,
  { maxAttempts: 5 }
)
```

### 4. Health Check System

Comprehensive health monitoring with circuit breaker integration.

#### Usage
```typescript
constructor(private healthCheckService: HealthCheckService) {
  // Register health checks
  this.healthCheckService.registerHealthCheck(
    'database',
    this.healthCheckService.createDatabaseHealthCheck(
      () => this.dataSource.query('SELECT 1')
    )
  )

  this.healthCheckService.registerHealthCheck(
    'redis',
    this.healthCheckService.createRedisHealthCheck(
      () => this.redisClient.ping()
    )
  )
}

// Get overall health status
const health = await this.healthCheckService.getHealthStatus()
```

### 5. Global Exception Filter

Enhanced global exception filter that:
- Handles all custom exception types
- Integrates with circuit breaker status
- Provides detailed error context
- Sanitizes sensitive information
- Logs errors with structured data

#### Error Response Format
```json
{
  "statusCode": 400,
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/api/v1/users",
  "method": "POST",
  "message": "Validation failed",
  "error": "Validation Error",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "value": "invalid-email",
      "constraints": ["must be a valid email"]
    }
  ],
  "context": {
    "resource": "User",
    "operation": "create"
  }
}
```

## API Endpoints

### Health and Monitoring
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health status with circuit breakers
- `GET /health/circuit-breakers` - Circuit breaker status
- `GET /health/circuit-breakers/:serviceName/reset` - Reset specific circuit breaker

### Demo Endpoints (Development Only)
- `GET /demo/error-handling/business-error` - Trigger business exception
- `GET /demo/error-handling/resource-not-found/:id` - Trigger not found exception
- `GET /demo/error-handling/circuit-breaker-demo` - Demonstrate circuit breaker
- `GET /demo/error-handling/retry-demo` - Demonstrate retry mechanism
- `POST /demo/error-handling/validation-error` - Trigger validation exception

## Configuration

### Environment Variables
```env
# Circuit Breaker Settings
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=30000
CIRCUIT_BREAKER_MONITORING_PERIOD=60000

# Retry Settings
RETRY_MAX_ATTEMPTS=3
RETRY_BASE_DELAY=1000
RETRY_MAX_DELAY=30000
```

### Module Integration
```typescript
import { ErrorHandlingModule } from './common/error-handling/error-handling.module'

@Module({
  imports: [
    ErrorHandlingModule, // Global error handling
    // ... other modules
  ],
})
export class AppModule {}
```

## Best Practices

### 1. Exception Handling
- Use specific exception types for different error scenarios
- Include relevant context in exception messages
- Don't expose sensitive information in error messages
- Log errors with appropriate detail level

### 2. Circuit Breaker Usage
- Apply circuit breakers to external service calls
- Configure appropriate thresholds based on service SLAs
- Monitor circuit breaker metrics
- Implement fallback strategies when possible

### 3. Retry Logic
- Only retry transient failures
- Use exponential backoff with jitter
- Set reasonable maximum retry attempts
- Implement circuit breakers alongside retries

### 4. Health Checks
- Register health checks for all critical dependencies
- Keep health checks lightweight and fast
- Use health check results for load balancer decisions
- Monitor health check trends over time

## Testing

The error handling system includes comprehensive tests covering:
- Custom exception creation and properties
- Circuit breaker state transitions
- Retry mechanism with various failure scenarios
- Health check registration and execution
- Global exception filter error processing

Run tests with:
```bash
npm test -- src/common/error-handling/error-handling.spec.ts
```

## Monitoring and Observability

The system provides detailed logging and metrics for:
- Exception occurrences and types
- Circuit breaker state changes
- Retry attempt patterns
- Service health trends
- Error recovery success rates

All errors are logged with structured data including:
- Error type and code
- Request context
- User information (when available)
- Circuit breaker status
- Retry attempt information