import { Test, TestingModule } from '@nestjs/testing'
import { LoggingController } from './logging.controller'
import { LoggingService } from './logging.service'

describe('LoggingController', () => {
  let controller: LoggingController
  let loggingService: jest.Mocked<LoggingService>

  beforeEach(async () => {
    const mockLoggingService = {
      queryLogs: jest.fn(),
      getLogStats: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoggingController],
      providers: [
        {
          provide: LoggingService,
          useValue: mockLoggingService,
        },
      ],
    }).compile()

    controller = module.get<LoggingController>(LoggingController)
    loggingService = module.get(LoggingService)
  })

  describe('getLogs', () => {
    it('should return logs with query parameters', async () => {
      const mockLogs = [
        {
          timestamp: '2023-01-01T10:00:00Z',
          level: 'info',
          message: 'Test log',
          module: 'TestModule',
        },
      ]

      loggingService.queryLogs.mockResolvedValue(mockLogs as any)

      const queryDto = {
        level: 'info',
        limit: 50,
        offset: 0,
      }

      const result = await controller.getLogs(queryDto)

      expect(result).toEqual({
        success: true,
        data: mockLogs,
        count: 1,
        query: queryDto,
      })

      expect(loggingService.queryLogs).toHaveBeenCalledWith(queryDto)
    })
  })

  describe('getLogStats', () => {
    it('should return log statistics', async () => {
      const mockStats = {
        totalLogs: 100,
        errorCount: 10,
        warningCount: 20,
        infoCount: 70,
        avgResponseTime: 150,
      }

      loggingService.getLogStats.mockResolvedValue(mockStats)

      const result = await controller.getLogStats()

      expect(result).toEqual({
        success: true,
        data: mockStats,
      })

      expect(loggingService.getLogStats).toHaveBeenCalled()
    })
  })

  describe('getLogLevels', () => {
    it('should return available log levels', async () => {
      const result = await controller.getLogLevels()

      expect(result).toEqual({
        success: true,
        data: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'],
      })
    })
  })

  describe('getModules', () => {
    it('should return available modules', async () => {
      const result = await controller.getModules()

      expect(result.success).toBe(true)
      expect(result.data).toContain('HTTP')
      expect(result.data).toContain('Auth')
      expect(result.data).toContain('Users')
    })
  })
})