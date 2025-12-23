import { Injectable, Logger } from '@nestjs/common'
import { CacheService } from './cache.service'

export interface SessionData {
  userId: string
  email: string
  role: string
  loginTime: Date
  lastActivity: Date
  ipAddress?: string
  userAgent?: string
}

export interface SessionOptions {
  ttl?: number // Session TTL in seconds
  slidingExpiration?: boolean // Whether to extend session on activity
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name)
  private readonly sessionPrefix = 'session'
  private readonly blacklistPrefix = 'blacklist'
  private readonly defaultSessionTTL = 24 * 60 * 60 // 24 hours
  private readonly defaultSlidingWindow = 30 * 60 // 30 minutes

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Create a new session
   */
  async createSession(
    sessionId: string,
    sessionData: SessionData,
    options: SessionOptions = {}
  ): Promise<void> {
    try {
      const ttl = options.ttl || this.defaultSessionTTL
      
      await this.cacheService.set(
        sessionId,
        {
          ...sessionData,
          loginTime: sessionData.loginTime.toISOString(),
          lastActivity: sessionData.lastActivity.toISOString(),
        },
        {
          ttl,
          prefix: this.sessionPrefix,
        }
      )

      this.logger.debug(`Session created: ${sessionId}`)
    } catch (error) {
      this.logger.error(`Failed to create session ${sessionId}:`, error)
      throw error
    }
  }

  /**
   * Get session data
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionData = await this.cacheService.get<any>(
        sessionId,
        this.sessionPrefix
      )

      if (!sessionData) {
        return null
      }

      // Convert ISO strings back to Date objects
      return {
        ...sessionData,
        loginTime: new Date(sessionData.loginTime),
        lastActivity: new Date(sessionData.lastActivity),
      }
    } catch (error) {
      this.logger.error(`Failed to get session ${sessionId}:`, error)
      return null
    }
  }

  /**
   * Update session activity
   */
  async updateActivity(
    sessionId: string,
    options: SessionOptions = {}
  ): Promise<void> {
    try {
      const session = await this.getSession(sessionId)
      if (!session) {
        throw new Error('Session not found')
      }

      // Update last activity
      session.lastActivity = new Date()

      // Extend session if sliding expiration is enabled
      const ttl = options.slidingExpiration 
        ? (options.ttl || this.defaultSlidingWindow)
        : undefined

      await this.cacheService.set(
        sessionId,
        {
          ...session,
          loginTime: session.loginTime.toISOString(),
          lastActivity: session.lastActivity.toISOString(),
        },
        {
          ttl,
          prefix: this.sessionPrefix,
        }
      )

      this.logger.debug(`Session activity updated: ${sessionId}`)
    } catch (error) {
      this.logger.error(`Failed to update session activity ${sessionId}:`, error)
      throw error
    }
  }

  /**
   * Destroy a session
   */
  async destroySession(sessionId: string): Promise<void> {
    try {
      await this.cacheService.del(sessionId, this.sessionPrefix)
      this.logger.debug(`Session destroyed: ${sessionId}`)
    } catch (error) {
      this.logger.error(`Failed to destroy session ${sessionId}:`, error)
      throw error
    }
  }

  /**
   * Check if session exists and is valid
   */
  async isValidSession(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId)
      return session !== null
    } catch (error) {
      this.logger.error(`Failed to validate session ${sessionId}:`, error)
      return false
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    try {
      const pattern = '*'
      const keys = await this.cacheService.keys(pattern, this.sessionPrefix)
      const sessions: string[] = []

      for (const key of keys) {
        const sessionId = key.split(':').pop()
        if (sessionId) {
          const session = await this.getSession(sessionId)
          if (session && session.userId === userId) {
            sessions.push(sessionId)
          }
        }
      }

      return sessions
    } catch (error) {
      this.logger.error(`Failed to get user sessions for ${userId}:`, error)
      return []
    }
  }

  /**
   * Destroy all sessions for a user
   */
  async destroyUserSessions(userId: string): Promise<void> {
    try {
      const sessions = await this.getUserSessions(userId)
      
      for (const sessionId of sessions) {
        await this.destroySession(sessionId)
      }

      this.logger.debug(`All sessions destroyed for user: ${userId}`)
    } catch (error) {
      this.logger.error(`Failed to destroy user sessions for ${userId}:`, error)
      throw error
    }
  }

  /**
   * Add token to blacklist (for JWT invalidation)
   */
  async blacklistToken(
    tokenId: string,
    expirationTime: Date
  ): Promise<void> {
    try {
      const now = new Date()
      const ttl = Math.max(0, Math.floor((expirationTime.getTime() - now.getTime()) / 1000))

      if (ttl > 0) {
        await this.cacheService.set(
          tokenId,
          { blacklistedAt: now.toISOString() },
          {
            ttl,
            prefix: this.blacklistPrefix,
          }
        )
      }

      this.logger.debug(`Token blacklisted: ${tokenId}`)
    } catch (error) {
      this.logger.error(`Failed to blacklist token ${tokenId}:`, error)
      throw error
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(tokenId: string): Promise<boolean> {
    try {
      return await this.cacheService.exists(tokenId, this.blacklistPrefix)
    } catch (error) {
      this.logger.error(`Failed to check token blacklist ${tokenId}:`, error)
      return false
    }
  }

  /**
   * Clean up expired sessions (manual cleanup)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const pattern = '*'
      const keys = await this.cacheService.keys(pattern, this.sessionPrefix)
      let cleanedCount = 0

      for (const key of keys) {
        const sessionId = key.split(':').pop()
        if (sessionId) {
          const session = await this.getSession(sessionId)
          if (!session) {
            cleanedCount++
          }
        }
      }

      this.logger.debug(`Cleaned up ${cleanedCount} expired sessions`)
      return cleanedCount
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions:', error)
      return 0
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number
    activeSessions: number
    blacklistedTokens: number
  }> {
    try {
      const sessionKeys = await this.cacheService.keys('*', this.sessionPrefix)
      const blacklistKeys = await this.cacheService.keys('*', this.blacklistPrefix)
      
      let activeSessions = 0
      for (const key of sessionKeys) {
        const sessionId = key.split(':').pop()
        if (sessionId && await this.isValidSession(sessionId)) {
          activeSessions++
        }
      }

      return {
        totalSessions: sessionKeys.length,
        activeSessions,
        blacklistedTokens: blacklistKeys.length,
      }
    } catch (error) {
      this.logger.error('Failed to get session stats:', error)
      return {
        totalSessions: 0,
        activeSessions: 0,
        blacklistedTokens: 0,
      }
    }
  }
}