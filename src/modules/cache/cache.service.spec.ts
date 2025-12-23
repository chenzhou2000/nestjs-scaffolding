import { Test, TestingModule } from '@nestjs/testing'
import { CacheService } from './cache.service'
import { createMockRedisClient } from '../../test/setup'
import * as fc from 'fast-check'

describe('CacheService', () => {
  let service: CacheService
  let mockRedisClient: any

  beforeEach(async () => {
    mockRedisClient = createMockRedisClient()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
      ],
    }).compile()

    service = module.get<CacheService>(CacheService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Cache Operations', () => {
    it('should set and get a value', async () => {
      const key = 'test-key'
      const value = { data: 'test-value' }

      await service.set(key, value)
      const result = await service.get(key)

      expect(result).toEqual(value)
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'nestjs-api:test-key',
        3600,
        JSON.stringify(value)
      )
    })

    it('should return null for non-existent key', async () => {
      const result = await service.get('non-existent-key')
      expect(result).toBeNull()
    })

    it('should delete a key', async () => {
      const key = 'test-key'
      const value = 'test-value'

      await service.set(key, value)
      await service.del(key)
      const result = await service.get(key)

      expect(result).toBeNull()
      expect(mockRedisClient.del).toHaveBeenCalledWith('nestjs-api:test-key')
    })

    it('should check if key exists', async () => {
      const key = 'test-key'
      const value = 'test-value'

      expect(await service.exists(key)).toBe(false)

      await service.set(key, value)
      expect(await service.exists(key)).toBe(true)

      await service.del(key)
      expect(await service.exists(key)).toBe(false)
    })

    it('should flush all cache', async () => {
      await service.set('key1', 'value1')
      await service.set('key2', 'value2')

      await service.flush()

      expect(await service.get('key1')).toBeNull()
      expect(await service.get('key2')).toBeNull()
      expect(mockRedisClient.flushdb).toHaveBeenCalled()
    })
  })

  describe('Advanced Cache Operations', () => {
    it('should handle multiple get operations', async () => {
      const keys = ['key1', 'key2', 'key3']
      const values = ['value1', 'value2', 'value3']

      // Set values
      for (let i = 0; i < keys.length; i++) {
        await service.set(keys[i], values[i])
      }

      const results = await service.mget(keys)
      expect(results).toEqual(values)
    })

    it('should handle multiple set operations', async () => {
      const keyValuePairs = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
        { key: 'key3', value: 'value3' },
      ]

      await service.mset(keyValuePairs)

      // Wait a bit for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 10))

      for (const { key, value } of keyValuePairs) {
        const result = await service.get(key)
        expect(result).toEqual(value)
      }
    })

    it('should increment numeric values', async () => {
      const key = 'counter'

      const result1 = await service.incr(key)
      expect(result1).toBe(1)

      const result2 = await service.incr(key)
      expect(result2).toBe(2)
    })

    it('should decrement numeric values', async () => {
      const key = 'counter'

      await service.incr(key) // Set to 1
      const result1 = await service.decr(key)
      expect(result1).toBe(0)

      const result2 = await service.decr(key)
      expect(result2).toBe(-1)
    })

    it('should set expiration for keys', async () => {
      const key = 'expiring-key'
      const value = 'expiring-value'

      await service.set(key, value)
      await service.expire(key, 60)

      expect(mockRedisClient.expire).toHaveBeenCalledWith('nestjs-api:expiring-key', 60)
    })

    it('should find keys by pattern', async () => {
      await service.set('user:1', 'user1')
      await service.set('user:2', 'user2')
      await service.set('post:1', 'post1')

      const userKeys = await service.keys('user:*')
      expect(userKeys).toContain('nestjs-api:user:1')
      expect(userKeys).toContain('nestjs-api:user:2')
      expect(userKeys).not.toContain('nestjs-api:post:1')
    })
  })

  describe('Prefix Handling', () => {
    it('should handle custom prefixes', async () => {
      const key = 'test-key'
      const value = 'test-value'
      const prefix = 'custom'

      await service.set(key, value, { prefix })
      const result = await service.get(key, prefix)

      expect(result).toEqual(value)
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'nestjs-api:custom:test-key',
        3600,
        JSON.stringify(value)
      )
    })

    it('should handle custom TTL', async () => {
      const key = 'test-key'
      const value = 'test-value'
      const ttl = 300

      await service.set(key, value, { ttl })

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'nestjs-api:test-key',
        ttl,
        JSON.stringify(value)
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle Redis errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection error'))

      const result = await service.get('test-key')
      expect(result).toBeNull()
    })

    it('should throw error on set failure', async () => {
      mockRedisClient.setex.mockRejectedValue(new Error('Redis connection error'))

      await expect(service.set('test-key', 'test-value')).rejects.toThrow('Redis connection error')
    })
  })

  describe('Property-Based Tests', () => {
    /**
     * Feature: nestjs-learning-api, Property 6: 缓存一致性机制
     * For any cacheable data, first query should fetch from database and cache,
     * subsequent queries should fetch from cache, data updates should clear related cache
     */
    it('should maintain cache consistency for any data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.jsonValue(), // Use jsonValue to ensure JSON-serializable data
          fc.integer({ min: 1, max: 3600 }),
          async (key, value, ttl) => {
            // Clear any existing data
            await service.del(key)

            // First set should store in cache
            await service.set(key, value, { ttl })
            const firstGet = await service.get(key)
            expect(firstGet).toEqual(value)

            // Second get should retrieve from cache
            const secondGet = await service.get(key)
            expect(secondGet).toEqual(value)

            // Update should work
            const newValue = typeof value === 'object' && value !== null 
              ? { ...value, updated: true }
              : { original: value, updated: true }
            await service.set(key, newValue, { ttl })
            const updatedGet = await service.get(key)
            expect(updatedGet).toEqual(newValue)

            // Delete should clear cache
            await service.del(key)
            const deletedGet = await service.get(key)
            expect(deletedGet).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })

    /**
     * Feature: nestjs-learning-api, Property 7: 会话存储功能
     * For any user session, system should store session info in Redis and retrieve correctly
     */
    it('should handle session storage for any session data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.record({
            userId: fc.string(),
            email: fc.emailAddress(),
            role: fc.constantFrom('user', 'admin', 'moderator'),
            data: fc.jsonValue() // Use jsonValue for JSON-serializable data
          }),
          async (sessionKey, sessionData) => {
            const prefix = 'session'

            // Store session
            await service.set(sessionKey, sessionData, { prefix })

            // Retrieve session
            const retrieved = await service.get(sessionKey, prefix)
            expect(retrieved).toEqual(sessionData)

            // Session should exist
            const exists = await service.exists(sessionKey, prefix)
            expect(exists).toBe(true)

            // Clear session
            await service.del(sessionKey, prefix)
            const clearedSession = await service.get(sessionKey, prefix)
            expect(clearedSession).toBeNull()
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})