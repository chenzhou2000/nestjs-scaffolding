import { Controller, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import {
  UserGrpcService,
  GetUserRequest,
  CreateUserRequest,
  UpdateUserRequest,
  DeleteUserRequest,
  ListUsersRequest,
  ListUsersResponse,
  UserResponse,
  Empty,
} from '../interfaces/user-grpc.interface';

@Controller()
export class GrpcUserController implements OnModuleInit {
  private userGrpcService: UserGrpcService;

  constructor(@Inject('USER_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.userGrpcService = this.client.getService<UserGrpcService>('UserService');
  }

  async getUser(data: GetUserRequest): Promise<Observable<UserResponse>> {
    return this.userGrpcService.GetUser(data);
  }

  async createUser(data: CreateUserRequest): Promise<Observable<UserResponse>> {
    return this.userGrpcService.CreateUser(data);
  }

  async updateUser(data: UpdateUserRequest): Promise<Observable<UserResponse>> {
    return this.userGrpcService.UpdateUser(data);
  }

  async deleteUser(data: DeleteUserRequest): Promise<Observable<Empty>> {
    return this.userGrpcService.DeleteUser(data);
  }

  async listUsers(data: ListUsersRequest): Promise<Observable<ListUsersResponse>> {
    return this.userGrpcService.ListUsers(data);
  }

  streamUsers(): Observable<UserResponse> {
    return this.userGrpcService.StreamUsers({});
  }
}