import { Injectable, Inject, Logger } from '@nestjs/common'
import { Redis } from 'ioredis'

export interface CacheOptions {
  ttl?: number // 生存时间（秒）
  prefix?: string
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name)
  private readonly defaultTTL = 3600 // 默认TTL为1小时

  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {}

  /**
   * 从缓存获取值
   */
  async get<T>(key: string, prefix?: string): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, prefix)
      const value = await this.redisClient.get(fullKey)
      
      if (value === null) {
        return null
      }

      return JSON.parse(value) as T
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error)
      return null
    }
  }

  /**
   * 在缓存中设置值
   */
  async set(
    key: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const fullKey = this.buildKey(key, options.prefix)
      const ttl = options.ttl || this.defaultTTL
      const serializedValue = JSON.stringify(value)

      await this.redisClient.setex(fullKey, ttl, serializedValue)
      this.logger.debug(`Cache set: ${fullKey} (TTL: ${ttl}s)`)
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error)
      throw error
    }
  }

  /**
   * 从缓存删除值
   */
  async del(key: string, prefix?: string): Promise<void> {
    try {
      const fullKey = this.buildKey(key, prefix)
      await this.redisClient.del(fullKey)
      this.logger.debug(`Cache deleted: ${fullKey}`)
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error)
      throw error
    }
  }

  /**
   * 检查键是否存在于缓存中
   */
  async exists(key: string, prefix?: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, prefix)
      const result = await this.redisClient.exists(fullKey)
      return result === 1
    } catch (error) {
      this.logger.error(`Failed to check cache key existence ${key}:`, error)
      return false
    }
  }

  /**
   * 清除所有缓存（刷新数据库）
   */
  async flush(): Promise<void> {
    try {
      await this.redisClient.flushdb()
      this.logger.debug('Cache flushed')
    } catch (error) {
      this.logger.error('Failed to flush cache:', error)
      throw error
    }
  }

  /**
   * 一次获取多个键
   */
  async mget<T>(keys: string[], prefix?: string): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(key => this.buildKey(key, prefix))
      const values = await this.redisClient.mget(...fullKeys)
      
      return values.map(value => {
        if (value === null) return null
        try {
          return JSON.parse(value) as T
        } catch {
          return null
        }
      })
    } catch (error) {
      this.logger.error('Failed to get multiple cache keys:', error)
      return keys.map(() => null)
    }
  }

  /**
   * 设置多个键值对
   */
  async mset(
    keyValuePairs: Array<{ key: string; value: any }>,
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const pipeline = this.redisClient.pipeline()
      const ttl = options.ttl || this.defaultTTL

      for (const { key, value } of keyValuePairs) {
        const fullKey = this.buildKey(key, options.prefix)
        const serializedValue = JSON.stringify(value)
        pipeline.setex(fullKey, ttl, serializedValue)
      }

      await pipeline.exec()
      this.logger.debug(`Multiple cache keys set (${keyValuePairs.length} keys)`)
    } catch (error) {
      this.logger.error('Failed to set multiple cache keys:', error)
      throw error
    }
  }

  /**
   * 增加缓存中的数值
   */
  async incr(key: string, prefix?: string): Promise<number> {
    try {
      const fullKey = this.buildKey(key, prefix)
      return await this.redisClient.incr(fullKey)
    } catch (error) {
      this.logger.error(`Failed to increment cache key ${key}:`, error)
      throw error
    }
  }

  /**
   * 减少缓存中的数值
   */
  async decr(key: string, prefix?: string): Promise<number> {
    try {
      const fullKey = this.buildKey(key, prefix)
      return await this.redisClient.decr(fullKey)
    } catch (error) {
      this.logger.error(`Failed to decrement cache key ${key}:`, error)
      throw error
    }
  }

  /**
   * 为键设置过期时间
   */
  async expire(key: string, ttl: number, prefix?: string): Promise<void> {
    try {
      const fullKey = this.buildKey(key, prefix)
      await this.redisClient.expire(fullKey, ttl)
    } catch (error) {
      this.logger.error(`Failed to set expiration for cache key ${key}:`, error)
      throw error
    }
  }

  /**
   * 获取匹配模式的键
   */
  async keys(pattern: string, prefix?: string): Promise<string[]> {
    try {
      const fullPattern = this.buildKey(pattern, prefix)
      return await this.redisClient.keys(fullPattern)
    } catch (error) {
      this.logger.error(`Failed to get keys with pattern ${pattern}:`, error)
      return []
    }
  }

  /**
   * 使用可选前缀构建完整缓存键
   */
  private buildKey(key: string, prefix?: string): string {
    const basePrefix = 'nestjs-api'
    if (prefix) {
      return `${basePrefix}:${prefix}:${key}`
    }
    return `${basePrefix}:${key}`
  }

  /**
   * 获取Redis客户端进行高级操作
   */
  getClient(): Redis {
    return this.redisClient
  }
}