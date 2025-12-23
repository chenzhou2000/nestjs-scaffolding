import { Observable } from 'rxjs';

export interface UserGrpcService {
  GetUser(data: GetUserRequest): Observable<UserResponse>;
  CreateUser(data: CreateUserRequest): Observable<UserResponse>;
  UpdateUser(data: UpdateUserRequest): Observable<UserResponse>;
  DeleteUser(data: DeleteUserRequest): Observable<Empty>;
  ListUsers(data: ListUsersRequest): Observable<ListUsersResponse>;
  StreamUsers(data: Empty): Observable<UserResponse>;
}

export interface GetUserRequest {
  id: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface DeleteUserRequest {
  id: string;
}

export interface ListUsersRequest {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
}

export interface ListUsersResponse {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Empty {}

export enum UserRole {
  USER = 0,
  ADMIN = 1,
  MODERATOR = 2,
}