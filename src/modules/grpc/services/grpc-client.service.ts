import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable, firstValueFrom } from 'rxjs';
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
import {
  NotificationGrpcService,
  SendNotificationRequest,
  GetNotificationsRequest,
  GetNotificationsResponse,
  MarkAsReadRequest,
  DeleteNotificationRequest,
  SubscribeRequest,
  NotificationResponse,
} from '../interfaces/notification-grpc.interface';

@Injectable()
export class GrpcClientService implements OnModuleInit {
  private readonly logger = new Logger(GrpcClientService.name);
  private userGrpcService: UserGrpcService;
  private notificationGrpcService: NotificationGrpcService;

  constructor(
    @Inject('USER_PACKAGE') private userClient: ClientGrpc,
    @Inject('NOTIFICATION_PACKAGE') private notificationClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.userGrpcService = this.userClient.getService<UserGrpcService>('UserService');
    this.notificationGrpcService = this.notificationClient.getService<NotificationGrpcService>('NotificationService');
  }

  // User service methods
  async getUserById(id: string): Promise<UserResponse> {
    try {
      this.logger.log(`Getting user via gRPC: ${id}`);
      return await firstValueFrom(this.userGrpcService.GetUser({ id }));
    } catch (error) {
      this.logger.error(`Error getting user via gRPC: ${error.message}`);
      throw error;
    }
  }

  async createUserViaGrpc(userData: CreateUserRequest): Promise<UserResponse> {
    try {
      this.logger.log(`Creating user via gRPC: ${userData.email}`);
      return await firstValueFrom(this.userGrpcService.CreateUser(userData));
    } catch (error) {
      this.logger.error(`Error creating user via gRPC: ${error.message}`);
      throw error;
    }
  }

  async updateUserViaGrpc(userData: UpdateUserRequest): Promise<UserResponse> {
    try {
      this.logger.log(`Updating user via gRPC: ${userData.id}`);
      return await firstValueFrom(this.userGrpcService.UpdateUser(userData));
    } catch (error) {
      this.logger.error(`Error updating user via gRPC: ${error.message}`);
      throw error;
    }
  }

  async deleteUserViaGrpc(id: string): Promise<void> {
    try {
      this.logger.log(`Deleting user via gRPC: ${id}`);
      await firstValueFrom(this.userGrpcService.DeleteUser({ id }));
    } catch (error) {
      this.logger.error(`Error deleting user via gRPC: ${error.message}`);
      throw error;
    }
  }

  async listUsersViaGrpc(query: ListUsersRequest): Promise<ListUsersResponse> {
    try {
      this.logger.log(`Listing users via gRPC`);
      return await firstValueFrom(this.userGrpcService.ListUsers(query));
    } catch (error) {
      this.logger.error(`Error listing users via gRPC: ${error.message}`);
      throw error;
    }
  }

  streamUsers(): Observable<UserResponse> {
    this.logger.log('Starting user stream via gRPC');
    return this.userGrpcService.StreamUsers({});
  }

  // Notification service methods
  async sendNotification(notificationData: SendNotificationRequest): Promise<NotificationResponse> {
    try {
      this.logger.log(`Sending notification via gRPC to user: ${notificationData.userId}`);
      return await firstValueFrom(this.notificationGrpcService.SendNotification(notificationData));
    } catch (error) {
      this.logger.error(`Error sending notification via gRPC: ${error.message}`);
      throw error;
    }
  }

  async getNotifications(query: GetNotificationsRequest): Promise<GetNotificationsResponse> {
    try {
      this.logger.log(`Getting notifications via gRPC for user: ${query.userId}`);
      return await firstValueFrom(this.notificationGrpcService.GetNotifications(query));
    } catch (error) {
      this.logger.error(`Error getting notifications via gRPC: ${error.message}`);
      throw error;
    }
  }

  async markNotificationAsRead(data: MarkAsReadRequest): Promise<NotificationResponse> {
    try {
      this.logger.log(`Marking notification as read via gRPC: ${data.notificationId}`);
      return await firstValueFrom(this.notificationGrpcService.MarkAsRead(data));
    } catch (error) {
      this.logger.error(`Error marking notification as read via gRPC: ${error.message}`);
      throw error;
    }
  }

  async deleteNotification(data: DeleteNotificationRequest): Promise<void> {
    try {
      this.logger.log(`Deleting notification via gRPC: ${data.notificationId}`);
      await firstValueFrom(this.notificationGrpcService.DeleteNotification(data));
    } catch (error) {
      this.logger.error(`Error deleting notification via gRPC: ${error.message}`);
      throw error;
    }
  }

  subscribeToNotifications(userId: string): Observable<NotificationResponse> {
    this.logger.log(`Subscribing to notifications via gRPC for user: ${userId}`);
    return this.notificationGrpcService.SubscribeToNotifications({ userId });
  }
}