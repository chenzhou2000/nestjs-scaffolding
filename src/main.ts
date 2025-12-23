import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import * as compression from 'compression'
import helmet from 'helmet'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
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

  // API prefix
  const apiPrefix = configService.get('API_PREFIX', 'api/v1')
  app.setGlobalPrefix(apiPrefix)

  // CORS configuration
  app.enableCors({
    origin: true,
    credentials: true,
  })

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('NestJS Learning API')
    .setDescription(
      'A comprehensive NestJS learning API with modern backend technologies',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('docs', app, document)

  // Start the application
  const port = configService.get('PORT', 3000)
  await app.listen(port)

  console.log(`🚀 Application is running on: http://localhost:${port}`)
  console.log(`📚 Swagger documentation: http://localhost:${port}/docs`)
}

bootstrap()
