import { registerAs } from '@nestjs/config'
import { WinstonModuleOptions } from 'nest-winston'
import * as winston from 'winston'
import { utilities as nestWinstonModuleUtilities } from 'nest-winston'

export const loggerConfig = registerAs(
  'logger',
  (): WinstonModuleOptions => ({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.metadata({
        fillExcept: ['message', 'level', 'timestamp', 'label'],
      }),
    ),
    transports: [
      // Console transport for development
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('NestJS-API', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
      
      // File transport for all logs
      new winston.transports.File({
        filename: 'logs/app.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      
      // File transport for error logs only
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      
      // File transport for HTTP requests
      new winston.transports.File({
        filename: 'logs/http.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      
      // File transport for performance logs
      new winston.transports.File({
        filename: 'logs/performance.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    ],
    
    // Exit on error
    exitOnError: false,
    
    // Handle exceptions and rejections
    exceptionHandlers: [
      new winston.transports.File({ filename: 'logs/exceptions.log' }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: 'logs/rejections.log' }),
    ],
  }),
)