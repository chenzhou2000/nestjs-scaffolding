import { Module, Global } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { CacheService } from './cache.service'
import { SessionService } from './session.service'
import { CacheInterceptor } from './interceptors/cache.interceptor'
import { CacheController } from './cache.controller'

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [CacheController],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const Redis = require('ioredis')
        const redisConfig = configService.get('redis')
        
        const client = new Redis({
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          db: redisConfig.db,
          retryDelayOnFailover: redisConfig.retryDelayOnFailover,
          enableReadyCheck: redisConfig.enableReadyCheck,
          maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
          lazyConnect: true,
        })

        // Handle connection events
        client.on('connect', () => {
          console.log('Redis client connected')
        })

        client.on('error', (err) => {
          console.error('Redis client error:', err)
        })

        client.on('ready', () => {
          console.log('Redis client ready')
        })

        // Connect to Redis
        try {
          await client.connect()
        } catch (error) {
          console.error('Failed to connect to Redis:', error)
          // In development, we might want to continue without Redis
          if (process.env.NODE_ENV === 'development') {
            console.warn('Continuing without Redis connection in development mode')
          } else {
            throw error
          }
        }

        return client
      },
      inject: [ConfigService],
    },
    CacheService,
    SessionService,
    CacheInterceptor,
  ],
  exports: [CacheService, SessionService, CacheInterceptor, 'REDIS_CLIENT'],
})
export class CacheModule {}