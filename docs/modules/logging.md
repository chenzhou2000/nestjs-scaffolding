# 日志监控模块

## 概述

日志监控模块为NestJS学习API项目提供全面的日志记录和监控功能。该模块基于Winston日志库构建，提供了结构化日志记录、HTTP请求跟踪、性能监控、错误捕获和日志查询等核心功能。

### 核心特性

- **Winston日志器集成**: 专业级日志记录，支持多种传输方式
- **HTTP请求日志**: 详细记录所有HTTP请求和响应信息
- **错误日志记录**: 全面的错误日志，包含堆栈跟踪和上下文信息
- **性能监控**: 跟踪关键操作的执行时间
- **日志查询和过滤**: 提供REST API查询和过滤日志
- **多级日志支持**: 支持error、warn、info、http、verbose、debug、silly等级别
- **文件日志存储**: 不同类型的日志分别存储到不同文件
- **日志轮转**: 自动日志文件管理

### 技术栈

- **Winston**: 核心日志库
- **nest-winston**: NestJS的Winston集成
- **文件系统**: 日志文件存储
- **TypeScript**: 类型安全的日志接口

## 功能特性

### 1. Winston日志器配置

日志系统采用Winston作为核心日志库，提供了灵活的配置选项和多种传输方式。

#### 配置结构

```typescript
// src/config/logger.config.ts
export const loggerConfig = registerAs(
  'logger',
  (): WinstonModuleOptions => ({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.metadata({
        fillExcept: ['message', 'level', 'timestamp', 'label'],
      }),
    ),
    transports: [
      // 控制台输出（开发环境）
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('NestJS-API', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
      
      // 所有日志文件
      new winston.transports.File({
        filename: 'logs/app.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      
      // 错误日志文件
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
      }),
      
      // HTTP请求日志文件
      new winston.transports.File({
        filename: 'logs/http.log',
      }),
      
      // 性能监控日志文件
      new winston.transports.File({
        filename: 'logs/performance.log',
      }),
    ],
  }),
)
```

#### 日志级别说明

| 级别 | 用途 | 示例场景 |
|------|------|----------|
| `error` | 需要立即关注的错误 | 数据库连接失败、未捕获异常 |
| `warn` | 需要调查的警告 | 性能警告、配置问题 |
| `info` | 一般信息 | 应用启动、用户操作 |
| `http` | HTTP请求信息 | 请求响应日志 |
| `verbose` | 详细信息 | 调试信息 |
| `debug` | 调试信息 | 开发调试 |
| `silly` | 最详细信息 | 深度调试 |

#### 环境变量配置

```bash
# .env
LOG_LEVEL=info  # 设置最小日志级别
```

### 2. HTTP请求拦截器实现

HTTP请求日志通过`LoggingInterceptor`自动记录所有进入应用的HTTP请求。

#### 拦截器实现

```typescript
// src/common/interceptors/logging.interceptor.ts
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

    // 提取用户ID（如果可用）
    const userId = (request as any).user?.id

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now
        
        // 记录HTTP请求
        this.loggingService.logHttpRequest(request, response, responseTime, userId)
        
        // 记录慢请求性能
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
        // 记录请求错误
        this.loggingService.logError(error, 'HTTP Request', request, userId)
        return throwError(() => error)
      }),
    )
  }
}
```

#### HTTP请求日志格式

每个HTTP请求都会生成包含以下信息的日志条目：

```json
{
  "timestamp": "2023-12-01T10:30:00.000Z",
  "level": "info",
  "message": "HTTP Request",
  "module": "HTTP",
  "method": "POST",
  "url": "/api/v1/users",
  "statusCode": 201,
  "responseTime": 150,
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "userId": "user-123",
  "metadata": {
    "headers": {
      "content-type": "application/json",
      "authorization": "[REDACTED]"
    },
    "query": {},
    "body": {
      "name": "张三",
      "email": "zhangsan@example.com",
      "password": "[REDACTED]"
    },
    "contentLength": "256"
  }
}
```

#### 敏感数据处理

系统自动识别并脱敏敏感信息：

```typescript
private sanitizeBody(body: any): any {
  if (!body) return body

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization']
  const sanitized = { ...body }

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]'
    }
  }

  return sanitized
}
```

### 3. 异常捕获和日志记录机制

系统提供了多层次的异常捕获和日志记录机制。

#### 全局异常过滤器集成

通过全局异常过滤器自动捕获和记录所有未处理的异常：

```typescript
// 在全局异常过滤器中使用
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly loggingService: LoggingService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const request = ctx.getRequest<Request>()
    const response = ctx.getResponse<Response>()
    
    // 记录异常
    if (exception instanceof Error) {
      this.loggingService.logError(
        exception,
        'GlobalExceptionFilter',
        request,
        (request as any).user?.id
      )
    }
    
    // 处理响应...
  }
}
```

#### 错误日志服务方法

`LoggingService`提供了专门的错误记录方法：

```typescript
/**
 * 记录错误及详细上下文
 */
logError(
  error: Error,
  context?: string,
  request?: Request,
  userId?: string,
): void {
  const logData: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: error.message,
    module: context || 'Unknown',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    metadata: {
      request: request ? {
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: this.sanitizeBody(request.body),
        ip: request.ip,
        userAgent: request.get('User-Agent'),
      } : undefined,
      userId,
    },
  }

  this.logger.error(error.message, logData)
}
```

#### 业务逻辑中的错误记录

在业务逻辑中手动记录错误：

```typescript
@Injectable()
export class UserService {
  constructor(private readonly loggingService: LoggingService) {}

  async createUser(userData: CreateUserDto): Promise<User> {
    try {
      // 业务逻辑
      const user = await this.userRepository.save(userData)
      
      // 记录成功操作
      this.loggingService.log(
        'info',
        `User created successfully: ${user.id}`,
        { userId: user.id, email: user.email },
        'UserService'
      )
      
      return user
    } catch (error) {
      // 记录错误
      this.loggingService.logError(
        error,
        'UserService.createUser',
        undefined,
        userData.email
      )
      throw error
    }
  }
}
```

## 配置说明

### 环境变量

```bash
# 日志级别配置
LOG_LEVEL=info          # 生产环境推荐使用info
LOG_LEVEL=debug         # 开发环境可使用debug

# 日志文件路径（可选，默认为logs目录）
LOG_DIR=./logs
```

### 模块配置

在应用模块中配置日志模块：

```typescript
// app.module.ts
import { WinstonModule } from 'nest-winston'
import { loggerConfig } from './config/logger.config'

@Module({
  imports: [
    // Winston模块配置
    WinstonModule.forRootAsync({
      useFactory: loggerConfig,
    }),
    
    // 日志模块
    LoggingModule,
  ],
  providers: [
    // 全局拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
```

### 日志文件结构

系统会在`logs/`目录下创建以下日志文件：

```
logs/
├── app.log           # 所有应用日志
├── error.log         # 仅错误日志
├── http.log          # HTTP请求日志
├── performance.log   # 性能监控日志
├── exceptions.log    # 未处理异常
└── rejections.log    # 未处理的Promise拒绝
```

## API接口

### 查询日志

```http
GET /api/v1/logs?level=error&module=Users&limit=50
```

#### 查询参数

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `level` | string | 按日志级别过滤 | - |
| `module` | string | 按模块名过滤 | - |
| `startDate` | string | 开始日期(ISO格式) | - |
| `endDate` | string | 结束日期(ISO格式) | - |
| `limit` | number | 返回条数(1-1000) | 100 |
| `offset` | number | 跳过条数 | 0 |
| `search` | string | 搜索关键词 | - |

#### 响应格式

```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2023-12-01T10:30:00.000Z",
      "level": "error",
      "message": "Database connection failed",
      "module": "Database",
      "error": {
        "name": "ConnectionError",
        "message": "Connection timeout",
        "stack": "Error: Connection timeout\n    at ..."
      },
      "metadata": {
        "userId": "user-123",
        "request": {
          "method": "GET",
          "url": "/api/v1/users"
        }
      }
    }
  ],
  "count": 1,
  "query": {
    "level": "error",
    "limit": 50
  }
}
```

## 使用示例

### 基础日志记录

```typescript
import { LoggingService } from './modules/logging/logging.service'

@Injectable()
export class MyService {
  constructor(private readonly loggingService: LoggingService) {}

  async myMethod() {
    // 记录信息日志
    this.loggingService.log(
      'info',
      'Operation started',
      { data: 'example' },
      'MyService'
    )
    
    try {
      // 业务逻辑
      const result = await this.performOperation()
      
      // 记录成功日志
      this.loggingService.log(
        'info',
        'Operation completed successfully',
        { result: result.id },
        'MyService'
      )
      
      return result
    } catch (error) {
      // 记录错误日志
      this.loggingService.logError(error, 'MyService.myMethod')
      throw error
    }
  }
}
```

### 自定义错误记录

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

### 程序化查询日志

```typescript
const logs = await this.loggingService.queryLogs({
  level: 'error',
  startDate: '2023-01-01T00:00:00Z',
  endDate: '2023-12-31T23:59:59Z',
  limit: 100
})

console.log(`Found ${logs.length} error logs`)
```

## 性能监控

### 性能装饰器使用

系统提供了`@Performance`装饰器，用于自动监控方法的执行时间。

#### 装饰器定义

```typescript
// src/common/decorators/performance.decorator.ts
export const PERFORMANCE_KEY = 'performance'

/**
 * 标记方法进行性能监控的装饰器
 */
export const Performance = (operationName?: string) =>
  SetMetadata(PERFORMANCE_KEY, operationName)
```

#### 性能拦截器实现

```typescript
// src/common/interceptors/performance.interceptor.ts
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
```

#### 使用示例

```typescript
@Injectable()
export class UserService {
  constructor(private readonly loggingService: LoggingService) {}

  @Performance('Database Query - Find Users')
  async findUsers(query: QueryUserDto): Promise<User[]> {
    // 这个方法的执行时间将被自动记录
    return await this.userRepository.find({
      where: query,
      take: query.limit,
      skip: query.offset,
    })
  }

  @Performance('Complex User Analysis')
  async analyzeUserBehavior(userId: string): Promise<UserAnalysis> {
    // 复杂的分析逻辑
    const user = await this.findUserById(userId)
    const activities = await this.getUserActivities(userId)
    const preferences = await this.analyzePreferences(activities)
    
    return {
      user,
      activities,
      preferences,
      analysisDate: new Date(),
    }
  }
}
```

#### 手动性能记录

除了装饰器，也可以手动记录性能指标：

```typescript
async performComplexOperation(): Promise<Result> {
  const startTime = Date.now()
  
  try {
    const result = await this.complexLogic()
    const duration = Date.now() - startTime
    
    // 记录成功的性能指标
    this.loggingService.logPerformance(
      'Complex Operation',
      duration,
      { 
        resultCount: result.length,
        cacheHit: result.fromCache,
      },
      userId
    )
    
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    
    // 记录失败的性能指标
    this.loggingService.logPerformance(
      'Complex Operation (Failed)',
      duration,
      { 
        error: error.message,
        stage: 'processing',
      },
      userId
    )
    
    throw error
  }
}
```

#### 性能日志格式

性能监控日志包含以下信息：

```json
{
  "timestamp": "2023-12-01T10:30:00.000Z",
  "level": "info",
  "message": "Performance: Database Query - Find Users",
  "module": "Performance",
  "responseTime": 250,
  "userId": "user-123",
  "metadata": {
    "operation": "Database Query - Find Users",
    "duration": 250,
    "className": "UserService",
    "methodName": "findUsers",
    "args": [
      {
        "limit": 10,
        "offset": 0,
        "search": "张"
      }
    ]
  }
}
```

### 性能监控最佳实践

1. **关键路径监控**: 对数据库查询、外部API调用、文件操作等关键操作添加性能监控
2. **阈值告警**: 设置性能阈值，超过阈值时记录警告日志
3. **批量操作监控**: 对批量处理操作进行性能跟踪
4. **缓存效果监控**: 监控缓存命中率和响应时间改善

```typescript
@Injectable()
export class OptimizedService {
  // 数据库查询监控
  @Performance('User Repository Query')
  async findUsersByRole(role: UserRole): Promise<User[]> {
    return await this.userRepository.find({ where: { role } })
  }

  // 外部API调用监控
  @Performance('External API Call')
  async fetchExternalData(endpoint: string): Promise<any> {
    const response = await this.httpService.get(endpoint).toPromise()
    return response.data
  }

  // 缓存操作监控
  @Performance('Cache Operation')
  async getCachedUserData(userId: string): Promise<UserData> {
    const cached = await this.cacheService.get(`user:${userId}`)
    if (cached) {
      this.loggingService.log('info', 'Cache hit', { userId }, 'CacheService')
      return cached
    }

    const userData = await this.fetchUserData(userId)
    await this.cacheService.set(`user:${userId}`, userData, 3600)
    return userData
  }
}
```

## 日志查询和过滤功能

### 高级查询功能

日志服务提供了强大的查询和过滤功能，支持多种查询条件组合。

#### 查询服务实现

```typescript
/**
 * 查询日志并应用过滤条件
 */
async queryLogs(queryDto: LogQueryDto): Promise<LogEntry[]> {
  const {
    level,
    module,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
    search,
  } = queryDto

  try {
    // 根据级别或默认读取app.log
    const logFiles = this.getLogFiles(level)
    const logs: LogEntry[] = []

    for (const logFile of logFiles) {
      const filePath = path.join(process.cwd(), 'logs', logFile)
      
      if (!fs.existsSync(filePath)) {
        continue
      }

      const fileContent = fs.readFileSync(filePath, 'utf8')
      const lines = fileContent.split('\n').filter(line => line.trim())

      for (const line of lines) {
        try {
          const logEntry: LogEntry = JSON.parse(line)
          
          // 应用过滤条件
          if (level && logEntry.level !== level) continue
          if (module && logEntry.module !== module) continue
          if (search && !this.matchesSearch(logEntry, search)) continue
          
          // 日期过滤
          if (startDate && new Date(logEntry.timestamp) < new Date(startDate)) continue
          if (endDate && new Date(logEntry.timestamp) > new Date(endDate)) continue

          logs.push(logEntry)
        } catch (parseError) {
          // 跳过无效的JSON行
          continue
        }
      }
    }

    // 按时间戳排序（最新的在前）
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // 应用分页
    return logs.slice(offset, offset + limit)
  } catch (error) {
    this.logError(error, 'LoggingService.queryLogs')
    return []
  }
}
```

#### 搜索匹配逻辑

```typescript
/**
 * 检查日志条目是否匹配搜索条件
 */
private matchesSearch(logEntry: LogEntry, search: string): boolean {
  const searchLower = search.toLowerCase()
  
  return (
    logEntry.message?.toLowerCase().includes(searchLower) ||
    logEntry.module?.toLowerCase().includes(searchLower) ||
    logEntry.url?.toLowerCase().includes(searchLower) ||
    JSON.stringify(logEntry.metadata || {}).toLowerCase().includes(searchLower)
  )
}
```

#### 日志文件选择策略

```typescript
/**
 * 根据级别获取相应的日志文件
 */
private getLogFiles(level?: string): string[] {
  switch (level) {
    case 'error':
      return ['error.log']
    case 'http':
      return ['http.log']
    case 'performance':
      return ['performance.log']
    default:
      return ['app.log', 'http.log', 'performance.log']
  }
}
```

### 日志统计功能

系统提供日志统计API，用于监控应用健康状况：

```typescript
/**
 * 获取日志统计信息
 */
async getLogStats(): Promise<{
  totalLogs: number
  errorCount: number
  warningCount: number
  infoCount: number
  avgResponseTime: number
}> {
  try {
    const logs = await this.queryLogs({ limit: 10000 })
    
    const stats = {
      totalLogs: logs.length,
      errorCount: logs.filter(log => log.level === 'error').length,
      warningCount: logs.filter(log => log.level === 'warn').length,
      infoCount: logs.filter(log => log.level === 'info').length,
      avgResponseTime: 0,
    }

    const responseTimes = logs
      .filter(log => log.responseTime)
      .map(log => log.responseTime)

    if (responseTimes.length > 0) {
      stats.avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
    }

    return stats
  } catch (error) {
    this.logError(error, 'LoggingService.getLogStats')
    return {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      avgResponseTime: 0,
    }
  }
}
```

### REST API端点

#### 1. 查询日志

```http
GET /api/v1/logs
```

**查询参数示例**:

```http
# 查询错误日志
GET /api/v1/logs?level=error&limit=50

# 查询特定模块的日志
GET /api/v1/logs?module=Users&startDate=2023-12-01T00:00:00Z

# 搜索包含特定关键词的日志
GET /api/v1/logs?search=database&limit=100

# 复合查询
GET /api/v1/logs?level=warn&module=Auth&search=login&limit=20&offset=0
```

#### 2. 获取日志统计

```http
GET /api/v1/logs/stats
```

**响应示例**:

```json
{
  "success": true,
  "data": {
    "totalLogs": 15420,
    "errorCount": 23,
    "warningCount": 156,
    "infoCount": 14890,
    "avgResponseTime": 245.6
  }
}
```

#### 3. 获取可用日志级别

```http
GET /api/v1/logs/levels
```

**响应示例**:

```json
{
  "success": true,
  "data": ["error", "warn", "info", "http", "verbose", "debug", "silly"]
}
```

#### 4. 获取可用模块列表

```http
GET /api/v1/logs/modules
```

**响应示例**:

```json
{
  "success": true,
  "data": [
    "HTTP",
    "Auth",
    "Users",
    "Cache",
    "gRPC",
    "Files",
    "Queue",
    "Performance",
    "Database",
    "Unknown"
  ]
}
```

## 日志管理最佳实践

### 1. 日志级别使用指南

```typescript
// ✅ 正确的日志级别使用
class UserService {
  async createUser(userData: CreateUserDto): Promise<User> {
    // info: 记录重要的业务操作
    this.loggingService.log('info', 'Creating new user', { email: userData.email }, 'UserService')
    
    try {
      const user = await this.userRepository.save(userData)
      
      // info: 记录成功的操作结果
      this.loggingService.log('info', 'User created successfully', { userId: user.id }, 'UserService')
      
      return user
    } catch (error) {
      // error: 记录需要立即关注的错误
      this.loggingService.logError(error, 'UserService.createUser')
      throw error
    }
  }

  async validateUser(email: string): Promise<boolean> {
    // debug: 记录调试信息（仅开发环境）
    this.loggingService.log('debug', 'Validating user email', { email }, 'UserService')
    
    const user = await this.userRepository.findOne({ where: { email } })
    
    if (!user) {
      // warn: 记录需要关注但不是错误的情况
      this.loggingService.log('warn', 'User validation failed - user not found', { email }, 'UserService')
      return false
    }
    
    return true
  }
}
```

### 2. 上下文信息包含

```typescript
// ✅ 包含丰富的上下文信息
this.loggingService.log('info', 'Payment processed', {
  userId: user.id,
  amount: payment.amount,
  currency: payment.currency,
  paymentMethod: payment.method,
  transactionId: payment.transactionId,
  processingTime: Date.now() - startTime
}, 'PaymentService')

// ❌ 缺少上下文信息
this.loggingService.log('info', 'Payment processed', {}, 'PaymentService')
```

### 3. 敏感数据处理

```typescript
// ✅ 正确处理敏感数据
const logData = {
  userId: user.id,
  email: user.email,
  // 不记录密码
  action: 'login_attempt',
  ip: request.ip,
  userAgent: request.get('User-Agent')
}

// ❌ 记录敏感数据
const logData = {
  userId: user.id,
  email: user.email,
  password: user.password, // 不应该记录
  creditCard: user.creditCard // 不应该记录
}
```

### 4. 性能监控策略

```typescript
// ✅ 监控关键性能指标
@Injectable()
export class DatabaseService {
  @Performance('Database Connection')
  async connect(): Promise<void> {
    // 监控数据库连接时间
  }

  @Performance('Complex Query')
  async complexQuery(params: QueryParams): Promise<Result[]> {
    // 监控复杂查询性能
  }

  async batchOperation(items: Item[]): Promise<void> {
    const startTime = Date.now()
    
    for (const item of items) {
      await this.processItem(item)
    }
    
    const duration = Date.now() - startTime
    
    // 手动记录批量操作性能
    this.loggingService.logPerformance(
      'Batch Operation',
      duration,
      { 
        itemCount: items.length,
        avgTimePerItem: duration / items.length
      }
    )
  }
}
```

### 5. 日志查询优化

```typescript
// ✅ 高效的日志查询
class LogAnalysisService {
  async getRecentErrors(hours: number = 24): Promise<LogEntry[]> {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    
    return await this.loggingService.queryLogs({
      level: 'error',
      startDate,
      limit: 1000
    })
  }

  async getSlowRequests(threshold: number = 1000): Promise<LogEntry[]> {
    const logs = await this.loggingService.queryLogs({
      level: 'info',
      module: 'Performance',
      limit: 5000
    })

    return logs.filter(log => 
      log.responseTime && log.responseTime > threshold
    )
  }

  async getUserActivityLogs(userId: string, days: number = 7): Promise<LogEntry[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    
    return await this.loggingService.queryLogs({
      startDate,
      search: userId,
      limit: 1000
    })
  }
}
```

### 6. 日志轮转和清理

```typescript
// 日志清理服务示例
@Injectable()
export class LogMaintenanceService {
  @Cron('0 2 * * *') // 每天凌晨2点执行
  async cleanOldLogs(): Promise<void> {
    const logDir = path.join(process.cwd(), 'logs')
    const maxAge = 30 * 24 * 60 * 60 * 1000 // 30天

    try {
      const files = fs.readdirSync(logDir)
      
      for (const file of files) {
        const filePath = path.join(logDir, file)
        const stats = fs.statSync(filePath)
        
        if (Date.now() - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath)
          this.loggingService.log('info', `Deleted old log file: ${file}`, {}, 'LogMaintenance')
        }
      }
    } catch (error) {
      this.loggingService.logError(error, 'LogMaintenanceService.cleanOldLogs')
    }
  }

  @Cron('0 1 * * 0') // 每周日凌晨1点执行
  async archiveLogs(): Promise<void> {
    // 实现日志归档逻辑
    this.loggingService.log('info', 'Log archiving completed', {}, 'LogMaintenance')
  }
}
```

## 故障排除

### 常见问题

#### 1. 日志文件权限问题

**问题**: 应用无法写入日志文件

**解决方案**:
```bash
# 确保logs目录存在且有写权限
mkdir -p logs
chmod 755 logs

# 检查文件权限
ls -la logs/
```

#### 2. 日志文件过大

**问题**: 日志文件增长过快，占用大量磁盘空间

**解决方案**:
```typescript
// 配置日志轮转
new winston.transports.File({
  filename: 'logs/app.log',
  maxsize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5, // 保留5个文件
  tailable: true
})
```

#### 3. 性能监控开销

**问题**: 性能监控影响应用性能

**解决方案**:
```typescript
// 条件性启用性能监控
const shouldMonitorPerformance = process.env.NODE_ENV !== 'production' || 
                                process.env.ENABLE_PERFORMANCE_MONITORING === 'true'

if (shouldMonitorPerformance) {
  // 启用性能监控
}
```

#### 4. 日志查询性能问题

**问题**: 查询大量日志时响应缓慢

**解决方案**:
- 限制查询结果数量
- 使用日期范围过滤
- 考虑使用专业的日志管理系统（如ELK Stack）

```typescript
// 优化查询
async queryLogs(queryDto: LogQueryDto): Promise<LogEntry[]> {
  // 限制最大查询范围
  const maxLimit = 1000
  const limit = Math.min(queryDto.limit || 100, maxLimit)
  
  // 如果没有日期范围，默认查询最近24小时
  if (!queryDto.startDate && !queryDto.endDate) {
    queryDto.startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
  
  return await this.performQuery(queryDto)
}
```

## 相关资源

### 官方文档
- [Winston官方文档](https://github.com/winstonjs/winston)
- [nest-winston文档](https://github.com/gremo/nest-winston)
- [NestJS拦截器文档](https://docs.nestjs.com/interceptors)

### 学习资源
- [日志最佳实践指南](https://12factor.net/logs)
- [结构化日志记录](https://stackify.com/what-is-structured-logging-and-why-developers-need-it/)
- [应用性能监控](https://newrelic.com/resources/articles/application-performance-monitoring)

### 社区资源
- [Winston GitHub仓库](https://github.com/winstonjs/winston)
- [NestJS社区](https://github.com/nestjs/nest)
- [日志管理工具对比](https://sematext.com/blog/logging-tools/)