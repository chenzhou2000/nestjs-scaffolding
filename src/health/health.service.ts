import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HealthIndicatorResult, HealthIndicator } from '@nestjs/terminus'
import Redis from 'ioredis'
import * as amqp from 'amqplib'

@Injectable()
export class HealthService extends HealthIndicator {
  private redis: Redis

  constructor(private configService: ConfigService) {
    super()
    this.initializeRedis()
  }

  private initializeRedis() {
    const redisConfig = this.configService.get('redis')
    this.redis = new Redis({
      host: redisConfig?.host || 'localhost',
      port: redisConfig?.port || 6379,
      password: redisConfig?.password,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  }

  async checkRedis(): Promise<HealthIndicatorResult> {
    const key = 'redis'
    try {
      await this.redis.ping()
      return this.getStatus(key, true, { status: 'connected' })
    } catch (error) {
      return this.getStatus(key, false, {
        status: 'disconnected',
        error: error.message,
      })
    }
  }

  async checkRabbitMQ(): Promise<HealthIndicatorResult> {
    const key = 'rabbitmq'

    try {
      const rabbitmqUrl =
        this.configService.get('rabbitmq.url') || 'amqp://localhost:5672'
      const connection = await amqp.connect(rabbitmqUrl)

      // Test creating a channel
      const channel = await connection.createChannel()
      await channel.close()
      await connection.close()

      return this.getStatus(key, true, { status: 'connected' })
    } catch (error) {
      return this.getStatus(key, false, {
        status: 'disconnected',
        error: error?.message || 'Unknown error',
      })
    }
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect()
    }
  }
}
