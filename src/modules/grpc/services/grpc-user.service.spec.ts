import { Test, TestingModule } from '@nestjs/testing';
import { GrpcUserService } from './grpc-user.service';
import { UsersService } from '../../users/users.service';
import { User, UserRole } from '../../../entities/user.entity';
import { UserRole as GrpcUserRole } from '../interfaces/user-grpc.interface';

describe('GrpcUserService', () => {
  let service: GrpcUserService;
  let usersService: jest.Mocked<UsersService>;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z'),
    files: [],
  };

  beforeEach(async () => {
    const mockUsersService = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrpcUserService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<GrpcUserService>(GrpcUserService);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUser', () => {
    it('should get a user by ID', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.getUser({ id: mockUser.id });

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        role: GrpcUserRole.USER,
        isActive: mockUser.isActive,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      });
      expect(usersService.findById).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const createUserRequest = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        role: GrpcUserRole.ADMIN,
      };

      const createdUser = {
        ...mockUser,
        email: createUserRequest.email,
        firstName: createUserRequest.firstName,
        lastName: createUserRequest.lastName,
        role: UserRole.ADMIN,
      };

      usersService.create.mockResolvedValue(createdUser);

      const result = await service.createUser(createUserRequest);

      expect(result.email).toBe(createUserRequest.email);
      expect(result.firstName).toBe(createUserRequest.firstName);
      expect(result.lastName).toBe(createUserRequest.lastName);
      expect(result.role).toBe(GrpcUserRole.ADMIN);
      expect(usersService.create).toHaveBeenCalledWith({
        email: createUserRequest.email,
        password: createUserRequest.password,
        firstName: createUserRequest.firstName,
        lastName: createUserRequest.lastName,
        role: UserRole.ADMIN,
      });
    });
  });

  describe('updateUser', () => {
    it('should update a user', async () => {
      const updateUserRequest = {
        id: mockUser.id,
        firstName: 'Updated',
        role: GrpcUserRole.MODERATOR,
      };

      const updatedUser = {
        ...mockUser,
        firstName: 'Updated',
        role: UserRole.MODERATOR,
      };

      usersService.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser(updateUserRequest);

      expect(result.firstName).toBe('Updated');
      expect(result.role).toBe(GrpcUserRole.MODERATOR);
      expect(usersService.update).toHaveBeenCalledWith(mockUser.id, {
        firstName: 'Updated',
        role: UserRole.MODERATOR,
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      usersService.delete.mockResolvedValue(undefined);

      const result = await service.deleteUser({ id: mockUser.id });

      expect(result).toEqual({});
      expect(usersService.delete).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('listUsers', () => {
    it('should list users with pagination', async () => {
      const mockResult = {
        data: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      usersService.findAll.mockResolvedValue(mockResult);

      const result = await service.listUsers({
        page: 1,
        limit: 10,
        search: 'test',
        role: GrpcUserRole.USER,
      });

      expect(result).toEqual({
        users: [{
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: GrpcUserRole.USER,
          isActive: mockUser.isActive,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
        }],
        total: 1,
        page: 1,
        limit: 10,
      });
      expect(usersService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'test',
        role: UserRole.USER,
      });
    });
  });
});