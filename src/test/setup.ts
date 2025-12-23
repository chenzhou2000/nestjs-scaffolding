import { Test, TestingModule } from '@nestjs/testing'
import { ConfigModule } from '@nestjs/config'

export const createTestingModule = async (providers: any[] = [], imports: any[] = []) => {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['.env.test', '.env'],
      }),
      ...imports,
    ],
    providers,
  })
}

// Mock Redis client for testing
export const createMockRedisClient = () => {
  const store = new Map<string, { value: string; expiry?: number }>()
  
  return {
    get: jest.fn().mockImplementation((key: string) => {
      const item = store.get(key)
      if (!item) return null
      if (item.expiry && Date.now() > item.expiry) {
        store.delete(key)
        return null
      }
      return item.value
    }),
    setex: jest.fn().mockImplementation((key: string, ttl: number, value: string) => {
      store.set(key, {
        value,
        expiry: ttl > 0 ? Date.now() + (ttl * 1000) : undefined
      })
      return 'OK'
    }),
    del: jest.fn().mockImplementation((key: string) => {
      const existed = store.has(key)
      store.delete(key)
      return existed ? 1 : 0
    }),
    exists: jest.fn().mockImplementation((key: string) => {
      const item = store.get(key)
      if (!item) return 0
      if (item.expiry && Date.now() > item.expiry) {
        store.delete(key)
        return 0
      }
      return 1
    }),
    flushdb: jest.fn().mockImplementation(() => {
      store.clear()
      return 'OK'
    }),
    mget: jest.fn().mockImplementation((...keys: string[]) => {
      return keys.map(key => {
        const item = store.get(key)
        if (!item) return null
        if (item.expiry && Date.now() > item.expiry) {
          store.delete(key)
          return null
        }
        return item.value
      })
    }),
    incr: jest.fn().mockImplementation((key: string) => {
      const item = store.get(key)
      const currentValue = item ? parseInt(item.value) || 0 : 0
      const newValue = currentValue + 1
      store.set(key, { value: newValue.toString() })
      return newValue
    }),
    decr: jest.fn().mockImplementation((key: string) => {
      const item = store.get(key)
      const currentValue = item ? parseInt(item.value) || 0 : 0
      const newValue = currentValue - 1
      store.set(key, { value: newValue.toString() })
      return newValue
    }),
    expire: jest.fn().mockImplementation((key: string, ttl: number) => {
      const item = store.get(key)
      if (!item) return 0
      store.set(key, {
        ...item,
        expiry: ttl > 0 ? Date.now() + (ttl * 1000) : undefined
      })
      return 1
    }),
    keys: jest.fn().mockImplementation((pattern: string) => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'))
      return Array.from(store.keys()).filter(key => regex.test(key))
    }),
    pipeline: jest.fn().mockImplementation(() => {
      const operations: Array<() => void> = []
      return {
        setex: jest.fn().mockImplementation((key: string, ttl: number, value: string) => {
          operations.push(() => {
            store.set(key, {
              value,
              expiry: ttl > 0 ? Date.now() + (ttl * 1000) : undefined
            })
          })
          return this
        }),
        exec: jest.fn().mockImplementation(async () => {
          operations.forEach(op => op())
          return operations.map(() => ['OK'])
        })
      }
    }),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
  }
}