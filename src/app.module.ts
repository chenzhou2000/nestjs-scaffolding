import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TerminusModule } from '@nestjs/terminus'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { HealthController } from './health/health.controller'
import { HealthService } from './health/health.service'
import { UsersModule } from './modules/users/users.module'
import { AuthModule } from './modules/auth/auth.module'
import { CacheModule } from './modules/cache/cache.module'
import { GrpcModule } from './modules/grpc/grpc.module'
import { LoggingModule } from './modules/logging/logging.module'
import { ErrorHandlingModule } from './common/error-handling/error-handling.module'
import { DemoModule } from './common/demo/demo.module'
import { databaseConfig } from './config/database.config'
import { redisConfig } from './config/redis.config'
import { rabbitmqConfig } from './config/rabbitmq.config'
import { loggerConfig } from './config/logger.config'

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'], // 先加载.env.local，然后加载.env
      load: [databaseConfig, redisConfig, rabbitmqConfig, loggerConfig], // 加载配置文件
    }),

    // 数据库模块 - 仅当数据库可用时
    TypeOrmModule.forRootAsync({
            useFactory: () => ({
              type: 'mysql',
              host: process.env.DB_HOST || 'localhost',
              port: parseInt(process.env.DB_PORT) || 3306,
              username: process.env.DB_USERNAME || 'root',
              password: process.env.DB_PASSWORD || 'password',
              database: process.env.DB_DATABASE || 'nestjs_learning_api',
              entities: [__dirname + '/**/*.entity{.ts,.js}'],
              migrations: [__dirname + '/migrations/*{.ts,.js}'],
              synchronize: process.env.NODE_ENV === 'development',
              logging: process.env.NODE_ENV === 'development',
              retryAttempts: 3,
              retryDelay: 3000,
            }),
          }),

    // 健康检查模块
    TerminusModule,

    // 核心模块
    ErrorHandlingModule, // 错误处理和熔断器模块

    // 功能模块
    LoggingModule, // 日志模块
    CacheModule, // 缓存模块
    UsersModule, // 用户模块
    AuthModule, // 验证模块
    GrpcModule, // gRPC模块
    
    // 演示模块 (仅在开发环境)
    ...(process.env.NODE_ENV === 'development' ? [DemoModule] : []),
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, HealthService],
})
export class AppModule {}
