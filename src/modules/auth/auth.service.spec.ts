import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { AuthService } from './auth.service'
import { User, UserRole } from '../../entities/user.entity'

describe('AuthService', () => {
  let service: AuthService
  let userRepository: Repository<User>
  let jwtService: JwtService

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    files: [],
  }

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  }

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    userRepository = module.get<Repository<User>>(getRepositoryToken(User))
    jwtService = module.get<JwtService>(JwtService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never)
      mockUserRepository.findOne.mockResolvedValue(mockUser)

      const result = await service.validateUser('test@example.com', 'password')

      expect(result).toEqual(mockUser)
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      })
    })

    it('should return null when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null)

      const result = await service.validateUser('test@example.com', 'password')

      expect(result).toBeNull()
    })

    it('should return null when password is invalid', async () => {
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never)
      mockUserRepository.findOne.mockResolvedValue(mockUser)

      const result = await service.validateUser('test@example.com', 'wrongpassword')

      expect(result).toBeNull()
    })
  })

  describe('login', () => {
    it('should return auth response when credentials are valid', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(mockUser)
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token')

      const loginDto = { email: 'test@example.com', password: 'password' }
      const result = await service.login(loginDto)

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
        },
        expiresIn: 3600,
      })
    })

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null)

      const loginDto = { email: 'test@example.com', password: 'wrongpassword' }

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException when user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false }
      jest.spyOn(service, 'validateUser').mockResolvedValue(inactiveUser)

      const loginDto = { email: 'test@example.com', password: 'password' }

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException)
    })
  })

  describe('register', () => {
    it('should create and return new user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null)
      mockUserRepository.create.mockReturnValue(mockUser)
      mockUserRepository.save.mockResolvedValue(mockUser)
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedPassword' as never)

      const registerDto = {
        email: 'test@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
      }

      const result = await service.register(registerDto)

      expect(result).toEqual(mockUser)
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...registerDto,
        password: 'hashedPassword',
      })
    })

    it('should throw ConflictException when user already exists', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser)

      const registerDto = {
        email: 'test@example.com',
        password: 'password',
        firstName: 'John',
        lastName: 'Doe',
      }

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException)
    })
  })

  describe('validateToken', () => {
    it('should return user when token is valid', async () => {
      mockJwtService.verify.mockReturnValue({ sub: mockUser.id })
      mockUserRepository.findOne.mockResolvedValue(mockUser)

      const result = await service.validateToken('valid-token')

      expect(result).toEqual(mockUser)
    })

    it('should throw UnauthorizedException when token is blacklisted', async () => {
      await service.logout('blacklisted-token')

      await expect(service.validateToken('blacklisted-token')).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      await expect(service.validateToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      )
    })
  })
})