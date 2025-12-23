import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  Sse,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GrpcClientService } from '../services/grpc-client.service';
import {
  CreateUserRequest,
  UpdateUserRequest,
  UserRole as GrpcUserRole,
} from '../interfaces/user-grpc.interface';
import {
  SendNotificationRequest,
  NotificationType,
} from '../interfaces/notification-grpc.interface';

@Controller('grpc-demo')
@UseGuards(JwtAuthGuard)
export class GrpcDemoController {
  private readonly logger = new Logger(GrpcDemoController.name);

  constructor(private readonly grpcClientService: GrpcClientService) {}

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    this.logger.log(`REST API: Getting user ${id} via gRPC`);
    return await this.grpcClientService.getUserById(id);
  }

  @Post('users')
  async createUser(@Body() userData: any) {
    this.logger.log(`REST API: Creating user via gRPC`);
    const createUserRequest: CreateUserRequest = {
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role || GrpcUserRole.USER,
    };
    return await this.grpcClientService.createUserViaGrpc(createUserRequest);
  }

  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() userData: any) {
    this.logger.log(`REST API: Updating user ${id} via gRPC`);
    const updateUserRequest: UpdateUserRequest = {
      id,
      ...userData,
    };
    return await this.grpcClientService.updateUserViaGrpc(updateUserRequest);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    this.logger.log(`REST API: Deleting user ${id} via gRPC`);
    await this.grpcClientService.deleteUserViaGrpc(id);
    return { message: 'User deleted successfully' };
  }

  @Get('users')
  async listUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    this.logger.log(`REST API: Listing users via gRPC`);
    const grpcRole = role ? this.mapStringToUserRole(role) : undefined;
    return await this.grpcClientService.listUsersViaGrpc({
      page,
      limit,
      search,
      role: grpcRole,
    });
  }

  @Sse('users/stream')
  streamUsers(): Observable<MessageEvent> {
    this.logger.log(`REST API: Starting user stream via gRPC`);
    return this.grpcClientService.streamUsers().pipe(
      map(user => ({
        data: JSON.stringify(user),
        type: 'user-update',
      } as MessageEvent)),
    );
  }

  @Post('notifications')
  async sendNotification(@Body() notificationData: any) {
    this.logger.log(`REST API: Sending notification via gRPC`);
    const sendNotificationRequest: SendNotificationRequest = {
      userId: notificationData.userId,
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type || NotificationType.INFO,
      metadata: notificationData.metadata,
    };
    return await this.grpcClientService.sendNotification(sendNotificationRequest);
  }

  @Get('notifications/:userId')
  async getNotifications(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    this.logger.log(`REST API: Getting notifications for user ${userId} via gRPC`);
    return await this.grpcClientService.getNotifications({
      userId,
      page,
      limit,
      unreadOnly,
    });
  }

  @Put('notifications/:notificationId/read')
  async markAsRead(
    @Param('notificationId') notificationId: string,
    @Body('userId') userId: string,
  ) {
    this.logger.log(`REST API: Marking notification ${notificationId} as read via gRPC`);
    return await this.grpcClientService.markNotificationAsRead({
      notificationId,
      userId,
    });
  }

  @Delete('notifications/:notificationId')
  async deleteNotification(
    @Param('notificationId') notificationId: string,
    @Body('userId') userId: string,
  ) {
    this.logger.log(`REST API: Deleting notification ${notificationId} via gRPC`);
    await this.grpcClientService.deleteNotification({
      notificationId,
      userId,
    });
    return { message: 'Notification deleted successfully' };
  }

  @Sse('notifications/:userId/stream')
  streamNotifications(@Param('userId') userId: string): Observable<MessageEvent> {
    this.logger.log(`REST API: Starting notification stream for user ${userId} via gRPC`);
    return this.grpcClientService.subscribeToNotifications(userId).pipe(
      map(notification => ({
        data: JSON.stringify(notification),
        type: 'notification',
      } as MessageEvent)),
    );
  }

  private mapStringToUserRole(role: string): GrpcUserRole {
    switch (role.toLowerCase()) {
      case 'admin':
        return GrpcUserRole.ADMIN;
      case 'moderator':
        return GrpcUserRole.MODERATOR;
      case 'user':
      default:
        return GrpcUserRole.USER;
    }
  }
}