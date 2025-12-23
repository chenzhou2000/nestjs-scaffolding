import { Injectable, Logger } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';
import {
  SendNotificationRequest,
  GetNotificationsRequest,
  GetNotificationsResponse,
  MarkAsReadRequest,
  DeleteNotificationRequest,
  SubscribeRequest,
  NotificationResponse,
  Empty,
  NotificationType,
} from '../interfaces/notification-grpc.interface';

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  metadata: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class GrpcNotificationService {
  private readonly logger = new Logger(GrpcNotificationService.name);
  private readonly notifications: Map<string, Notification> = new Map();
  private readonly notificationStreams: Map<string, Subject<NotificationResponse>> = new Map();
  private notificationIdCounter = 1;

  @GrpcMethod('NotificationService', 'SendNotification')
  async sendNotification(data: SendNotificationRequest): Promise<NotificationResponse> {
    try {
      this.logger.log(`Sending notification to user: ${data.userId}`);
      
      const notification: Notification = {
        id: `notification_${this.notificationIdCounter++}`,
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        isRead: false,
        metadata: data.metadata || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.notifications.set(notification.id, notification);
      
      const response = this.mapNotificationToResponse(notification);
      
      // Send to user's stream if they're subscribed
      const userStream = this.notificationStreams.get(data.userId);
      if (userStream) {
        userStream.next(response);
      }
      
      return response;
    } catch (error) {
      this.logger.error(`Error sending notification: ${error.message}`);
      throw error;
    }
  }

  @GrpcMethod('NotificationService', 'GetNotifications')
  async getNotifications(data: GetNotificationsRequest): Promise<GetNotificationsResponse> {
    try {
      this.logger.log(`Getting notifications for user: ${data.userId}`);
      
      const userNotifications = Array.from(this.notifications.values())
        .filter(notification => {
          if (notification.userId !== data.userId) return false;
          if (data.unreadOnly && notification.isRead) return false;
          return true;
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const startIndex = (data.page - 1) * data.limit;
      const endIndex = startIndex + data.limit;
      const paginatedNotifications = userNotifications.slice(startIndex, endIndex);

      return {
        notifications: paginatedNotifications.map(notification => 
          this.mapNotificationToResponse(notification)
        ),
        total: userNotifications.length,
        page: data.page,
        limit: data.limit,
      };
    } catch (error) {
      this.logger.error(`Error getting notifications: ${error.message}`);
      throw error;
    }
  }

  @GrpcMethod('NotificationService', 'MarkAsRead')
  async markAsRead(data: MarkAsReadRequest): Promise<NotificationResponse> {
    try {
      this.logger.log(`Marking notification as read: ${data.notificationId}`);
      
      const notification = this.notifications.get(data.notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }
      
      if (notification.userId !== data.userId) {
        throw new Error('Unauthorized access to notification');
      }
      
      notification.isRead = true;
      notification.updatedAt = new Date();
      
      this.notifications.set(notification.id, notification);
      
      return this.mapNotificationToResponse(notification);
    } catch (error) {
      this.logger.error(`Error marking notification as read: ${error.message}`);
      throw error;
    }
  }

  @GrpcMethod('NotificationService', 'DeleteNotification')
  async deleteNotification(data: DeleteNotificationRequest): Promise<Empty> {
    try {
      this.logger.log(`Deleting notification: ${data.notificationId}`);
      
      const notification = this.notifications.get(data.notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }
      
      if (notification.userId !== data.userId) {
        throw new Error('Unauthorized access to notification');
      }
      
      this.notifications.delete(data.notificationId);
      
      return {};
    } catch (error) {
      this.logger.error(`Error deleting notification: ${error.message}`);
      throw error;
    }
  }

  @GrpcStreamMethod('NotificationService', 'SubscribeToNotifications')
  subscribeToNotifications(data: SubscribeRequest): Observable<NotificationResponse> {
    this.logger.log(`User ${data.userId} subscribing to notifications`);
    
    if (!this.notificationStreams.has(data.userId)) {
      this.notificationStreams.set(data.userId, new Subject<NotificationResponse>());
    }
    
    const userStream = this.notificationStreams.get(data.userId);
    
    // Clean up stream when user disconnects
    return new Observable<NotificationResponse>(subscriber => {
      const subscription = userStream.subscribe(subscriber);
      
      return () => {
        subscription.unsubscribe();
        if (userStream.observers.length === 0) {
          this.notificationStreams.delete(data.userId);
          this.logger.log(`Cleaned up notification stream for user: ${data.userId}`);
        }
      };
    });
  }

  private mapNotificationToResponse(notification: Notification): NotificationResponse {
    return {
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      metadata: notification.metadata,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
    };
  }
}