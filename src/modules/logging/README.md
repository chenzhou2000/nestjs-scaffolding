# Logging Module

This module provides comprehensive logging and monitoring capabilities for the NestJS Learning API project.

## Features

- **Winston Logger Integration**: Professional logging with multiple transports
- **HTTP Request Logging**: Detailed logging of all HTTP requests and responses
- **Error Logging**: Comprehensive error logging with stack traces and context
- **Performance Monitoring**: Track execution time of critical operations
- **Log Query and Filtering**: REST API to query and filter logs
- **Multiple Log Levels**: Support for error, warn, info, http, verbose, debug, silly
- **File-based Logging**: Separate log files for different types of logs
- **Log Rotation**: Automatic log file management

## Configuration

The logging configuration is defined in `src/config/logger.config.ts`. You can customize:

- Log levels
- File paths
- Log formats
- Transport settings

### Environment Variables

- `LOG_LEVEL`: Set the minimum log level (default: 'info')

## Usage

### Basic Logging

```typescript
import { LoggingService } from './modules/logging/logging.service'

@Injectable()
export class MyService {
  constructor(private readonly loggingService: LoggingService) {}

  async myMethod() {
    this.loggingService.log('info', 'Operation started', { data: 'example' }, 'MyService')
    
    try {
      // Your code here
    } catch (error) {
      this.loggingService.logError(error, 'MyService.myMethod')
    }
  }
}
```

### Performance Monitoring

Use the `@Performance` decorator to automatically log execution time:

```typescript
import { Performance } from '../../common/decorators/performance.decorator'

@Injectable()
export class MyService {
  @Performance('Database Query')
  async findUsers() {
    // This method's execution time will be automatically logged
    return await this.userRepository.find()
  }
}
```

### HTTP Request Logging

HTTP requests are automatically logged by the `LoggingInterceptor`. No additional configuration needed.

### Error Logging

Errors are automatically logged by the `GlobalExceptionFilter` with full context including:
- Error details and stack trace
- Request information
- User context (if available)

## Log Files

The following log files are created in the `logs/` directory:

- `app.log`: All application logs
- `error.log`: Error logs only
- `http.log`: HTTP request logs
- `performance.log`: Performance monitoring logs
- `exceptions.log`: Unhandled exceptions
- `rejections.log`: Unhandled promise rejections

## API Endpoints

### Query Logs

```
GET /api/v1/logs?level=error&module=Users&limit=50
```

Query parameters:
- `level`: Filter by log level (error, warn, info, etc.)
- `module`: Filter by module name
- `startDate`: Filter logs after this date (ISO string)
- `endDate`: Filter logs before this date (ISO string)
- `limit`: Maximum number of logs to return (1-1000, default: 100)
- `offset`: Number of logs to skip (default: 0)
- `search`: Search in log messages and metadata

### Get Log Statistics

```
GET /api/v1/logs/stats
```

Returns:
- Total log count
- Error count
- Warning count
- Info count
- Average response time

### Get Available Log Levels

```
GET /api/v1/logs/levels
```

### Get Available Modules

```
GET /api/v1/logs/modules
```

## Security

- Log endpoints require admin role authentication
- Sensitive data (passwords, tokens) are automatically redacted from logs
- Request bodies are sanitized before logging

## Best Practices

1. **Use appropriate log levels**:
   - `error`: For errors that need immediate attention
   - `warn`: For warnings that should be investigated
   - `info`: For general information
   - `debug`: For debugging information (development only)

2. **Include context**: Always provide meaningful context in your logs

3. **Use performance monitoring**: Add `@Performance` decorator to critical methods

4. **Don't log sensitive data**: The system automatically redacts common sensitive fields

5. **Monitor log file sizes**: Implement log rotation in production

## Examples

### Custom Error Logging

```typescript
try {
  await this.processPayment(paymentData)
} catch (error) {
  this.loggingService.logError(
    error,
    'PaymentService.processPayment',
    request,
    userId
  )
  throw error
}
```

### Performance Logging

```typescript
const startTime = Date.now()
const result = await this.complexOperation()
const duration = Date.now() - startTime

this.loggingService.logPerformance(
  'Complex Operation',
  duration,
  { resultCount: result.length },
  userId
)
```

### Querying Logs Programmatically

```typescript
const logs = await this.loggingService.queryLogs({
  level: 'error',
  startDate: '2023-01-01T00:00:00Z',
  endDate: '2023-12-31T23:59:59Z',
  limit: 100
})
```