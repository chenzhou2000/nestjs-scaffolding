import { Injectable, Inject } from '@nestjs/common'
import { WINSTON_MODULE_PROVIDER } from 'nest-winston'
import { Logger } from 'winston'
import { Request, Response } from 'express'
import * as fs from 'fs'
import * as path from 'path'
import { LogQueryDto } from './dto/log-query.dto'

export interface LogEntry {
  timestamp: string
  level: string
  message: string
  metadata?: any
  module?: string
  method?: string
  url?: string
  statusCode?: number
  responseTime?: number
  ip?: string
  userAgent?: string
  userId?: string
  error?: {
    name: string
    message: string
    stack: string
  }
}

@Injectable()
export class LoggingService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Log HTTP request with detailed information
   */
  logHttpRequest(
    request: Request,
    response: Response,
    responseTime: number,
    userId?: string,
  ): void {
    const logData: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'HTTP Request',
      module: 'HTTP',
      method: request.method,
      url: request.url,
      statusCode: response.statusCode,
      responseTime,
      ip: request.ip || request.connection.remoteAddress,
      userAgent: request.get('User-Agent'),
      userId,
      metadata: {
        headers: request.headers,
        query: request.query,
        body: this.sanitizeBody(request.body),
        contentLength: response.get('content-length'),
      },
    }

    this.logger.info('HTTP Request', logData)
  }

  /**
   * Log error with detailed context
   */
  logError(
    error: Error,
    context?: string,
    request?: Request,
    userId?: string,
  ): void {
    const logData: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message,
      module: context || 'Unknown',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      metadata: {
        request: request
          ? {
              method: request.method,
              url: request.url,
              headers: request.headers,
              body: this.sanitizeBody(request.body),
              ip: request.ip,
              userAgent: request.get('User-Agent'),
            }
          : undefined,
        userId,
      },
    }

    this.logger.error(error.message, logData)
  }

  /**
   * Log performance metrics
   */
  logPerformance(
    operation: string,
    duration: number,
    metadata?: any,
    userId?: string,
  ): void {
    const logData: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Performance: ${operation}`,
      module: 'Performance',
      responseTime: duration,
      userId,
      metadata: {
        operation,
        duration,
        ...metadata,
      },
    }

    this.logger.info(`Performance: ${operation} took ${duration}ms`, logData)
  }

  /**
   * Generic logging method
   */
  log(level: string, message: string, metadata?: any, module?: string): void {
    const logData: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      module,
      metadata,
    }

    this.logger.log(level, message, logData)
  }

  /**
   * Query logs with filtering
   */
  async queryLogs(queryDto: LogQueryDto): Promise<LogEntry[]> {
    const {
      level,
      module,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
      search,
    } = queryDto

    try {
      // Read log files based on level or default to app.log
      const logFiles = this.getLogFiles(level)
      const logs: LogEntry[] = []

      for (const logFile of logFiles) {
        const filePath = path.join(process.cwd(), 'logs', logFile)
        
        if (!fs.existsSync(filePath)) {
          continue
        }

        const fileContent = fs.readFileSync(filePath, 'utf8')
        const lines = fileContent.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const logEntry: LogEntry = JSON.parse(line)
            
            // Apply filters
            if (level && logEntry.level !== level) continue
            if (module && logEntry.module !== module) continue
            if (search && !this.matchesSearch(logEntry, search)) continue
            
            // Date filtering
            if (startDate && new Date(logEntry.timestamp) < new Date(startDate)) continue
            if (endDate && new Date(logEntry.timestamp) > new Date(endDate)) continue

            logs.push(logEntry)
          } catch (parseError) {
            // Skip invalid JSON lines
            continue
          }
        }
      }

      // Sort by timestamp (newest first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      // Apply pagination
      return logs.slice(offset, offset + limit)
    } catch (error) {
      this.logError(error, 'LoggingService.queryLogs')
      return []
    }
  }

  /**
   * Get log statistics
   */
  async getLogStats(): Promise<{
    totalLogs: number
    errorCount: number
    warningCount: number
    infoCount: number
    avgResponseTime: number
  }> {
    try {
      const logs = await this.queryLogs({ limit: 10000 })
      
      const stats = {
        totalLogs: logs.length,
        errorCount: logs.filter(log => log.level === 'error').length,
        warningCount: logs.filter(log => log.level === 'warn').length,
        infoCount: logs.filter(log => log.level === 'info').length,
        avgResponseTime: 0,
      }

      const responseTimes = logs
        .filter(log => log.responseTime)
        .map(log => log.responseTime)

      if (responseTimes.length > 0) {
        stats.avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      }

      return stats
    } catch (error) {
      this.logError(error, 'LoggingService.getLogStats')
      return {
        totalLogs: 0,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        avgResponseTime: 0,
      }
    }
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  private sanitizeBody(body: any): any {
    if (!body) return body

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization']
    const sanitized = { ...body }

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]'
      }
    }

    return sanitized
  }

  /**
   * Get appropriate log files based on level
   */
  private getLogFiles(level?: string): string[] {
    switch (level) {
      case 'error':
        return ['error.log']
      case 'http':
        return ['http.log']
      case 'performance':
        return ['performance.log']
      default:
        return ['app.log', 'http.log', 'performance.log']
    }
  }

  /**
   * Check if log entry matches search criteria
   */
  private matchesSearch(logEntry: LogEntry, search: string): boolean {
    const searchLower = search.toLowerCase()
    
    return (
      logEntry.message?.toLowerCase().includes(searchLower) ||
      logEntry.module?.toLowerCase().includes(searchLower) ||
      logEntry.url?.toLowerCase().includes(searchLower) ||
      JSON.stringify(logEntry.metadata || {}).toLowerCase().includes(searchLower)
    )
  }
}