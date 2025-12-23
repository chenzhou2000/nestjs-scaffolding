import { Module } from '@nestjs/common'
import { WinstonModule } from 'nest-winston'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { LoggingService } from './logging.service'
import { LoggingController } from './logging.controller'
import { loggerConfig } from '../../config/logger.config'

@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return configService.get('logger')
      },
      inject: [ConfigService],
    }),
  ],
  providers: [LoggingService],
  controllers: [LoggingController],
  exports: [LoggingService, WinstonModule],
})
export class LoggingModule {}