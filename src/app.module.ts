import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TerminusModule } from '@nestjs/terminus'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { HealthController } from './health/health.controller'
import { HealthService } from './health/health.service'
import { UsersModule } from './modules/users/users.module'
import { databaseConfig } from './config/database.config'
import { redisConfig } from './config/redis.config'
import { rabbitmqConfig } from './config/rabbitmq.config'

@Module({
  imports: [
    // Configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'], // Load .env.local first, then .env
      load: [databaseConfig, redisConfig, rabbitmqConfig], // Load configuration files
    }),

    // Database module - only if database is available
    ...(process.env.NODE_ENV !== 'test'
      ? [
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
        ]
      : []),

    // Health check module
    TerminusModule,

    // Feature modules
    UsersModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, HealthService],
})
export class AppModule {}
