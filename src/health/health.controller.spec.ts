import { Test, TestingModule } from '@nestjs/testing'
import { TerminusModule } from '@nestjs/terminus'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { HealthController } from './health.controller'
import { HealthService } from './health.service'

describe('HealthController', () => {
  let controller: HealthController
  let healthService: HealthService

  beforeEach(async () => {
    const mockHealthService = {
      checkRedis: jest.fn().mockResolvedValue({ redis: { status: 'up' } }),
      checkRabbitMQ: jest
        .fn()
        .mockResolvedValue({ rabbitmq: { status: 'up' } }),
    }

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TerminusModule,
      ],
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile()

    controller = module.get<HealthController>(HealthController)
    healthService = module.get<HealthService>(HealthService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('alive', () => {
    it('should return alive status', () => {
      const result = controller.alive()
      expect(result).toHaveProperty('status', 'ok')
      expect(result).toHaveProperty('timestamp')
      expect(result).toHaveProperty('uptime')
      expect(result).toHaveProperty('version')
    })
  })
})
