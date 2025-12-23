import { Injectable, Logger } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';
import { UsersService } from '../../users/users.service';
import {
  GetUserRequest,
  CreateUserRequest,
  UpdateUserRequest,
  DeleteUserRequest,
  ListUsersRequest,
  ListUsersResponse,
  UserResponse,
  Empty,
  UserRole as GrpcUserRole,
} from '../interfaces/user-grpc.interface';
import { User, UserRole } from '../../../entities/user.entity';

@Injectable()
export class GrpcUserService {
  private readonly logger = new Logger(GrpcUserService.name);
  private readonly userStreamSubject = new Subject<UserResponse>();

  constructor(private readonly usersService: UsersService) {}

  @GrpcMethod('UserService', 'GetUser')
  async getUser(data: GetUserRequest): Promise<UserResponse> {
    try {
      this.logger.log(`Getting user with ID: ${data.id}`);
      const user = await this.usersService.findById(data.id);
      return this.mapUserToResponse(user);
    } catch (error) {
      this.logger.error(`Error getting user: ${error.message}`);
      throw error;
    }
  }

  @GrpcMethod('UserService', 'CreateUser')
  async createUser(data: CreateUserRequest): Promise<UserResponse> {
    try {
      this.logger.log(`Creating user with email: ${data.email}`);
      const createUserDto = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: this.mapGrpcRoleToEntityRole(data.role),
      };
      
      const user = await this.usersService.create(createUserDto);
      const response = this.mapUserToResponse(user);
      
      // Emit to stream subscribers
      this.userStreamSubject.next(response);
      
      return response;
    } catch (error) {
      this.logger.error(`Error creating user: ${error.message}`);
      throw error;
    }
  }

  @GrpcMethod('UserService', 'UpdateUser')
  async updateUser(data: UpdateUserRequest): Promise<UserResponse> {
    try {
      this.logger.log(`Updating user with ID: ${data.id}`);
      const updateUserDto: any = {};
      
      if (data.email !== undefined) updateUserDto.email = data.email;
      if (data.firstName !== undefined) updateUserDto.firstName = data.firstName;
      if (data.lastName !== undefined) updateUserDto.lastName = data.lastName;
      if (data.role !== undefined) updateUserDto.role = this.mapGrpcRoleToEntityRole(data.role);
      if (data.isActive !== undefined) updateUserDto.isActive = data.isActive;
      
      const user = await this.usersService.update(data.id, updateUserDto);
      const response = this.mapUserToResponse(user);
      
      // Emit to stream subscribers
      this.userStreamSubject.next(response);
      
      return response;
    } catch (error) {
      this.logger.error(`Error updating user: ${error.message}`);
      throw error;
    }
  }

  @GrpcMethod('UserService', 'DeleteUser')
  async deleteUser(data: DeleteUserRequest): Promise<Empty> {
    try {
      this.logger.log(`Deleting user with ID: ${data.id}`);
      await this.usersService.delete(data.id);
      return {};
    } catch (error) {
      this.logger.error(`Error deleting user: ${error.message}`);
      throw error;
    }
  }

  @GrpcMethod('UserService', 'ListUsers')
  async listUsers(data: ListUsersRequest): Promise<ListUsersResponse> {
    try {
      this.logger.log(`Listing users - page: ${data.page}, limit: ${data.limit}`);
      const queryDto = {
        page: data.page,
        limit: data.limit,
        search: data.search,
        role: data.role !== undefined ? this.mapGrpcRoleToEntityRole(data.role) : undefined,
      };
      
      const result = await this.usersService.findAll(queryDto);
      
      return {
        users: result.data.map(user => this.mapUserToResponse(user)),
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    } catch (error) {
      this.logger.error(`Error listing users: ${error.message}`);
      throw error;
    }
  }

  @GrpcStreamMethod('UserService', 'StreamUsers')
  streamUsers(): Observable<UserResponse> {
    this.logger.log('Starting user stream');
    return this.userStreamSubject.asObservable();
  }

  private mapUserToResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: this.mapEntityRoleToGrpcRole(user.role),
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private mapGrpcRoleToEntityRole(grpcRole: GrpcUserRole): UserRole {
    switch (grpcRole) {
      case GrpcUserRole.USER:
        return UserRole.USER;
      case GrpcUserRole.ADMIN:
        return UserRole.ADMIN;
      case GrpcUserRole.MODERATOR:
        return UserRole.MODERATOR;
      default:
        return UserRole.USER;
    }
  }

  private mapEntityRoleToGrpcRole(entityRole: UserRole): GrpcUserRole {
    switch (entityRole) {
      case UserRole.USER:
        return GrpcUserRole.USER;
      case UserRole.ADMIN:
        return GrpcUserRole.ADMIN;
      case UserRole.MODERATOR:
        return GrpcUserRole.MODERATOR;
      default:
        return GrpcUserRole.USER;
    }
  }
}