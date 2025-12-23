import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor'
import { LoggingService } from './modules/logging/logging.service'
import * as compression from 'compression'
import helmet from 'helmet'
import * as fs from 'fs'
import * as path from 'path'

async function bootstrap() {
  // Ensure logs directory exists
  const logsDir = path.join(process.cwd(), 'logs')
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }

  // 创建NestJS应用程序
  const app = await NestFactory.create(AppModule)

  // 使用Winston作为默认日志记录器
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))

  // 获取ConfigService实例
  const configService = app.get(ConfigService)
  const loggingService = app.get(LoggingService)

  // 安全中间件
  app.use(helmet())
  app.use(compression())

  // 全局管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // 全局过滤器和拦截器
  app.useGlobalFilters(new GlobalExceptionFilter(loggingService))
  app.useGlobalInterceptors(
    new LoggingInterceptor(loggingService),
    new PerformanceInterceptor(app.get('Reflector'), loggingService),
  )

  // api 前缀
  const apiPrefix = configService.get('API_PREFIX', 'api/v1')
  app.setGlobalPrefix(apiPrefix)

  // CORS 配置
  app.enableCors({
    origin: true,
    credentials: true,
  })

  // 启动应用程序
  const port = configService.get('PORT', 3000)
  await app.listen(port)

  // Log application startup
  loggingService.log('info', `🚀 Application is running on: http://localhost:${port}`, {
    port,
    apiPrefix,
    environment: process.env.NODE_ENV || 'development',
  }, 'Bootstrap')

  console.log(`🚀 Application is running on: http://localhost:${port}`)
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error)
  process.exit(1)
})
