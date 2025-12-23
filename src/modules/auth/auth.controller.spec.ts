import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { UnauthorizedException } from '@nestjs/common'
import { UserRole } from '../../entities/user.entity'

describe('AuthController', () => {
  let controller: AuthController
  let authService: AuthService

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
  }

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockAuthResponse = {
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
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile()

    controller = module.get<AuthController>(AuthController)
    authService = module.get<AuthService>(AuthService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      }

      mockAuthService.register.mockResolvedValue({ ...mockUser, password: 'hashedPassword' })

      const result = await controller.register(registerDto)

      expect(result).toEqual(mockUser)
      expect(authService.register).toHaveBeenCalledWith(registerDto)
    })
  })

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      }

      mockAuthService.login.mockResolvedValue(mockAuthResponse)

      const result = await controller.login(loginDto)

      expect(result).toEqual(mockAuthResponse)
      expect(authService.login).toHaveBeenCalledWith(loginDto)
    })
  })

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer access-token',
        },
      }

      mockAuthService.logout.mockResolvedValue(undefined)

      const result = await controller.logout(mockRequest)

      expect(result).toEqual({ message: 'Successfully logged out' })
      expect(authService.logout).toHaveBeenCalledWith('access-token')
    })
  })

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'refresh-token'

      mockAuthService.refreshToken.mockResolvedValue(mockAuthResponse)

      const result = await controller.refreshToken(refreshToken)

      expect(result).toEqual(mockAuthResponse)
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshToken)
    })
  })

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockRequest = {
        user: mockUser,
      }

      const result = await controller.getProfile(mockRequest)

      expect(result).toEqual(mockUser)
    })
  })
})