import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { User } from '../../entities/user.entity'
import { LoginDto, RegisterDto, AuthResponseDto } from '../../dto/auth.dto'

@Injectable()
export class AuthService {
  private blacklistedTokens = new Set<string>() // In production, use Redis

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } })
    if (user && await bcrypt.compare(password, user.password)) {
      return user
    }
    return null
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password)
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated')
    }

    const payload = { email: user.email, sub: user.id, role: user.role }
    const accessToken = this.jwtService.sign(payload)
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' })

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
    if (this.blacklistedTokens.has(token)) {
      throw new UnauthorizedException('Token has been revoked')
    }

    try {
      const payload = this.jwtService.verify(token)
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
    // Add token to blacklist
    this.blacklistedTokens.add(token)
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken)
      const user = await this.userRepository.findOne({ where: { id: payload.sub } })
      
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive')
      }

      const newPayload = { email: user.email, sub: user.id, role: user.role }
      const accessToken = this.jwtService.sign(newPayload)
      const newRefreshToken = this.jwtService.sign(newPayload, { expiresIn: '7d' })

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
}