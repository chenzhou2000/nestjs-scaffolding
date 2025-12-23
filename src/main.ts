import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import * as compression from 'compression'
import helmet from 'helmet'

async function bootstrap() {
  // Create the NestJS application
  const app = await NestFactory.create(AppModule)

  // Get ConfigService instance
  const configService = app.get(ConfigService)

  // Security middleware
  app.use(helmet())
  app.use(compression())

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // Global filters and interceptors
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

  // Start the application
  const port = configService.get('PORT', 3000)
  await app.listen(port)

  console.log(`🚀 Application is running on: http://localhost:${port}`)
}

bootstrap()
