import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConflictException, NotFoundException } from '@nestjs/common'
import { UsersService } from './users.service'
import { User, UserRole } from '../../entities/user.entity'
import { CreateUserDto } from '../../dto/create-user.dto'
import { UpdateUserDto } from '../../dto/update-user.dto'
import { QueryUserDto } from '../../dto/query-user.dto'

describe('UsersService', () => {
  let service: UsersService
  let repository: Repository<User>

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  }

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
    repository = module.get<Repository<User>>(getRepositoryToken(User))

    // Reset mocks
    jest.clearAllMocks()
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.USER,
    }

    it('should create a user successfully', async () => {
      const mockUser = { id: '1', ...createUserDto }
      
      mockRepository.findOne.mockResolvedValue(null)
      mockRepository.create.mockReturnValue(mockUser)
      mockRepository.save.mockResolvedValue(mockUser)

      const result = await service.create(createUserDto)

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      })
      expect(mockRepository.create).toHaveBeenCalled()
      expect(mockRepository.save).toHaveBeenCalled()
      expect(result).toEqual(mockUser)
    })

    it('should throw ConflictException if user already exists', async () => {
      const existingUser = { id: '1', email: createUserDto.email }
      mockRepository.findOne.mockResolvedValue(existingUser)

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException)
    })
  })

  describe('findById', () => {
    it('should return a user if found', async () => {
      const mockUser = { id: '1', email: 'test@example.com' }
      mockRepository.findOne.mockResolvedValue(mockUser)

      const result = await service.findById('1')

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['files'],
      })
      expect(result).toEqual(mockUser)
    })

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null)

      await expect(service.findById('1')).rejects.toThrow(NotFoundException)
    })
  })

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const queryDto: QueryUserDto = { page: 1, limit: 10 }
      const mockUsers = [{ id: '1' }, { id: '2' }]
      const total = 2

      mockQueryBuilder.getManyAndCount.mockResolvedValue([mockUsers, total])

      const result = await service.findAll(queryDto)

      expect(result).toEqual({
        data: mockUsers,
        total,
        page: 1,
        limit: 10,
        totalPages: 1,
      })
    })

    it('should apply search filter', async () => {
      const queryDto: QueryUserDto = { search: 'john' }
      mockQueryBuilder.getManyAndCount.mockResolvedValue([[], 0])

      await service.findAll(queryDto)

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(user.firstName LIKE :search OR user.lastName LIKE :search OR user.email LIKE :search)',
        { search: '%john%' }
      )
    })
  })

  describe('update', () => {
    const updateUserDto: UpdateUserDto = { firstName: 'Jane' }

    it('should update user successfully', async () => {
      const existingUser = { id: '1', email: 'test@example.com', firstName: 'John' }
      const updatedUser = { ...existingUser, ...updateUserDto }

      mockRepository.findOne.mockResolvedValue(existingUser)
      mockRepository.save.mockResolvedValue(updatedUser)

      const result = await service.update('1', updateUserDto)

      expect(result).toEqual(updatedUser)
    })

    it('should throw ConflictException if email already exists', async () => {
      const existingUser = { id: '1', email: 'test@example.com' }
      const anotherUser = { id: '2', email: 'new@example.com' }
      const updateDto = { email: 'new@example.com' }

      mockRepository.findOne
        .mockResolvedValueOnce(existingUser) // First call for findById
        .mockResolvedValueOnce(anotherUser) // Second call for email check

      await expect(service.update('1', updateDto)).rejects.toThrow(ConflictException)
    })
  })

  describe('delete', () => {
    it('should delete user successfully', async () => {
      const mockUser = { id: '1', email: 'test@example.com' }
      mockRepository.findOne.mockResolvedValue(mockUser)
      mockRepository.remove.mockResolvedValue(mockUser)

      await service.delete('1')

      expect(mockRepository.remove).toHaveBeenCalledWith(mockUser)
    })

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null)

      await expect(service.delete('1')).rejects.toThrow(NotFoundException)
    })
  })
})