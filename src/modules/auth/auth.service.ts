import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { User } from '../../entities/user.entity'
import { LoginDto, RegisterDto, AuthResponseDto } from '../../dto/auth.dto'
import { SessionService, SessionData } from '../cache/session.service'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private sessionService: SessionService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } })
    if (user && await bcrypt.compare(password, user.password)) {
      return user
    }
    return null
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated')
    }

    // Generate session ID and JWT payload
    const sessionId = uuidv4()
    const jwtPayload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role,
      sessionId 
    }
    
    const accessToken = this.jwtService.sign(jwtPayload)
    const refreshToken = this.jwtService.sign(jwtPayload, { expiresIn: '7d' })

    // Create session data
    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      loginTime: new Date(),
      lastActivity: new Date(),
      ipAddress,
      userAgent,
    }

    // Store session in Redis
    await this.sessionService.createSession(sessionId, sessionData, {
      ttl: 24 * 60 * 60, // 24 hours
      slidingExpiration: true,
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      expiresIn: 3600, // 1 hour in seconds
    }
  }

  async register(registerDto: RegisterDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    })

    if (existingUser) {
      throw new ConflictException('User with this email already exists')
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10)
    
    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
    })

    return this.userRepository.save(user)
  }

  async validateToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token)
      
      // Check if token is blacklisted
      if (await this.sessionService.isTokenBlacklisted(payload.jti || payload.sessionId)) {
        throw new UnauthorizedException('Token has been revoked')
      }

      // Validate session if sessionId exists
      if (payload.sessionId) {
        const isValidSession = await this.sessionService.isValidSession(payload.sessionId)
        if (!isValidSession) {
          throw new UnauthorizedException('Session has expired')
        }

        // Update session activity
        await this.sessionService.updateActivity(payload.sessionId, {
          slidingExpiration: true,
          ttl: 30 * 60, // 30 minutes sliding window
        })
      }

      const user = await this.userRepository.findOne({ where: { id: payload.sub } })
      
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive')
      }

      return user
    } catch (error) {
      throw new UnauthorizedException('Invalid token')
    }
  }

  async logout(token: string): Promise<void> {
    try {
      const payload = this.jwtService.verify(token)
      
      // Destroy session if sessionId exists
      if (payload.sessionId) {
        await this.sessionService.destroySession(payload.sessionId)
      }

      // Blacklist the token
      const tokenId = payload.jti || payload.sessionId || token
      const expirationTime = new Date(payload.exp * 1000)
      await this.sessionService.blacklistToken(tokenId, expirationTime)
    } catch (error) {
      // Even if token is invalid, we should not throw an error on logout
      console.warn('Error during logout:', error.message)
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken)
      const user = await this.userRepository.findOne({ where: { id: payload.sub } })
      
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive')
      }

      // Generate new session ID
      const newSessionId = uuidv4()
      const newPayload = { 
        email: user.email, 
        sub: user.id, 
        role: user.role,
        sessionId: newSessionId 
      }
      
      const accessToken = this.jwtService.sign(newPayload)
      const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' })

      // Create new session
      const sessionData: SessionData = {
        userId: user.id,
        email: user.email,
        role: user.role,
        loginTime: new Date(),
        lastActivity: new Date(),
      }

      await this.sessionService.createSession(newSessionId, sessionData, {
        ttl: 24 * 60 * 60, // 24 hours
        slidingExpiration: true,
      })

      // Destroy old session if it exists
      if (payload.sessionId) {
        await this.sessionService.destroySession(payload.sessionId)
      }

      return {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        expiresIn: 3600,
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    return await this.sessionService.getUserSessions(userId)
  }

  /**
   * Destroy all sessions for a user (useful for security purposes)
   */
  async logoutAllSessions(userId: string): Promise<void> {
    await this.sessionService.destroyUserSessions(userId)
  }
}