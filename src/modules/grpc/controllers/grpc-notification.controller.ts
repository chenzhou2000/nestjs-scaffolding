import { Controller, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import {
  NotificationGrpcService,
  SendNotificationRequest,
  GetNotificationsRequest,
  GetNotificationsResponse,
  MarkAsReadRequest,
  DeleteNotificationRequest,
  SubscribeRequest,
  NotificationResponse,
  Empty,
} from '../interfaces/notification-grpc.interface';

@Controller()
export class GrpcNotificationController implements OnModuleInit {
  private notificationGrpcService: NotificationGrpcService;

  constructor(@Inject('NOTIFICATION_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.notificationGrpcService = this.client.getService<NotificationGrpcService>('NotificationService');
  }

  async sendNotification(data: SendNotificationRequest): Promise<Observable<NotificationResponse>> {
    return this.notificationGrpcService.SendNotification(data);
  }

  async getNotifications(data: GetNotificationsRequest): Promise<Observable<GetNotificationsResponse>> {
    return this.notificationGrpcService.GetNotifications(data);
  }

  async markAsRead(data: MarkAsReadRequest): Promise<Observable<NotificationResponse>> {
    return this.notificationGrpcService.MarkAsRead(data);
  }

  async deleteNotification(data: DeleteNotificationRequest): Promise<Observable<Empty>> {
    return this.notificationGrpcService.DeleteNotification(data);
  }

  subscribeToNotifications(data: SubscribeRequest): Observable<NotificationResponse> {
    return this.notificationGrpcService.SubscribeToNotifications(data);
  }
}