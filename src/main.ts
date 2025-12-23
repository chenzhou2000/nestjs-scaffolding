import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import * as compression from 'compression'
import helmet from 'helmet'

async function bootstrap() {
  // 创建NestJS应用程序
  const app = await NestFactory.create(AppModule)

  // 获取ConfigService实例
  const configService = app.get(ConfigService)

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
  app.useGlobalFilters(new GlobalExceptionFilter())
  app.useGlobalInterceptors(new LoggingInterceptor())

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

  console.log(`🚀 Application is running on: http://localhost:${port}`)
}

bootstrap()
