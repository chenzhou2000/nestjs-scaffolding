import { Test, TestingModule } from '@nestjs/testing'
import { WINSTON_MODULE_PROVIDER } from 'nest-winston'
import { LoggingService } from './logging.service'
import { Logger } from 'winston'
import * as fs from 'fs'
import * as path from 'path'

describe('LoggingService', () => {
  let service: LoggingService
  let mockLogger: jest.Mocked<Logger>

  beforeEach(async () => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
    } as any

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingService,
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile()

    service = module.get<LoggingService>(LoggingService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('logHttpRequest', () => {
    it('should log HTTP request with correct format', () => {
      const mockRequest = {
        method: 'GET',
        url: '/api/users',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        headers: { 'content-type': 'application/json' },
        query: { page: 1 },
        body: { test: 'data' },
        connection: { remoteAddress: '127.0.0.1' },
      } as any

      const mockResponse = {
        statusCode: 200,
        get: jest.fn().mockReturnValue('1024'),
      } as any

      service.logHttpRequest(mockRequest, mockResponse, 150, 'user123')

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          level: 'info',
          message: 'HTTP Request',
          module: 'HTTP',
          method: 'GET',
          url: '/api/users',
          statusCode: 200,
          responseTime: 150,
          ip: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          userId: 'user123',
        })
      )
    })

    it('should sanitize sensitive data in request body', () => {
      const mockRequest = {
        method: 'POST',
        url: '/api/auth/login',
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
        headers: {},
        query: {},
        body: { email: 'test@example.com', password: 'secret123' },
        connection: { remoteAddress: '127.0.0.1' },
      } as any

      const mockResponse = {
        statusCode: 200,
        get: jest.fn().mockReturnValue('512'),
      } as any

      service.logHttpRequest(mockRequest, mockResponse, 100)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'HTTP Request',
        expect.objectContaining({
          metadata: expect.objectContaining({
            body: expect.objectContaining({
              password: '[REDACTED]',
              email: 'test@example.com',
            }),
          }),
        })
      )
    })
  })

  describe('logError', () => {
    it('should log error with context and stack trace', () => {
      const error = new Error('Test error')
      const mockRequest = {
        method: 'POST',
        url: '/api/users',
        headers: { 'content-type': 'application/json' },
        body: { name: 'John' },
        ip: '127.0.0.1',
        get: jest.fn().mockReturnValue('Mozilla/5.0'),
      } as any

      service.logError(error, 'TestService', mockRequest, 'user123')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Test error',
        expect.objectContaining({
          level: 'error',
          message: 'Test error',
          module: 'TestService',
          userId: 'user123',
          error: {
            name: 'Error',
            message: 'Test error',
            stack: expect.any(String),
          },
        })
      )
    })

    it('should log error without request context', () => {
      const error = new Error('Test error')

      service.logError(error, 'TestService')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Test error',
        expect.objectContaining({
          level: 'error',
          message: 'Test error',
          module: 'TestService',
          error: {
            name: 'Error',
            message: 'Test error',
            stack: expect.any(String),
          },
        })
      )
    })
  })

  describe('logPerformance', () => {
    it('should log performance metrics', () => {
      const metadata = { queryCount: 5, cacheHit: true }

      service.logPerformance('Database Query', 250, metadata, 'user123')

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance: Database Query took 250ms',
        expect.objectContaining({
          level: 'info',
          message: 'Performance: Database Query',
          module: 'Performance',
          responseTime: 250,
          userId: 'user123',
          metadata: {
            operation: 'Database Query',
            duration: 250,
            queryCount: 5,
            cacheHit: true,
          },
        })
      )
    })
  })

  describe('log', () => {
    it('should log with custom level and metadata', () => {
      const metadata = { customData: 'test' }

      service.log('warn', 'Custom warning', metadata, 'CustomModule')

      expect(mockLogger.log).toHaveBeenCalledWith(
        'warn',
        'Custom warning',
        expect.objectContaining({
          level: 'warn',
          message: 'Custom warning',
          module: 'CustomModule',
          metadata,
        })
      )
    })
  })

  describe('queryLogs', () => {
    beforeEach(() => {
      // Mock fs.existsSync and fs.readFileSync
      jest.spyOn(fs, 'existsSync').mockReturnValue(true)
      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        JSON.stringify({
          timestamp: '2023-01-01T10:00:00Z',
          level: 'info',
          message: 'Test log',
          module: 'TestModule',
        }) + '\n' +
        JSON.stringify({
          timestamp: '2023-01-01T11:00:00Z',
          level: 'error',
          message: 'Test error',
          module: 'ErrorModule',
        })
      )
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should query logs with filters', async () => {
      const result = await service.queryLogs({
        level: 'info',
        limit: 10,
        offset: 0,
      })

      expect(result).toHaveLength(1)
      expect(result[0].level).toBe('info')
      expect(result[0].message).toBe('Test log')
    })

    it('should filter logs by module', async () => {
      const result = await service.queryLogs({
        module: 'ErrorModule',
        limit: 10,
        offset: 0,
      })

      expect(result).toHaveLength(1)
      expect(result[0].module).toBe('ErrorModule')
    })

    it('should handle search filter', async () => {
      const result = await service.queryLogs({
        search: 'error',
        limit: 10,
        offset: 0,
      })

      expect(result).toHaveLength(1)
      expect(result[0].message).toBe('Test error')
    })
  })

  describe('getLogStats', () => {
    beforeEach(() => {
      jest.spyOn(service, 'queryLogs').mockResolvedValue([
        {
          timestamp: '2023-01-01T10:00:00Z',
          level: 'info',
          message: 'Test info',
          responseTime: 100,
        },
        {
          timestamp: '2023-01-01T11:00:00Z',
          level: 'error',
          message: 'Test error',
          responseTime: 200,
        },
        {
          timestamp: '2023-01-01T12:00:00Z',
          level: 'warn',
          message: 'Test warning',
          responseTime: 150,
        },
      ] as any)
    })

    it('should return correct log statistics', async () => {
      const stats = await service.getLogStats()

      expect(stats).toEqual({
        totalLogs: 3,
        errorCount: 1,
        warningCount: 1,
        infoCount: 1,
        avgResponseTime: 150, // (100 + 200 + 150) / 3
      })
    })
  })
})