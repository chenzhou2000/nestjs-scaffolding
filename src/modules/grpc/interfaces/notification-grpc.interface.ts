import { Observable } from 'rxjs';

export interface NotificationGrpcService {
  SendNotification(data: SendNotificationRequest): Observable<NotificationResponse>;
  GetNotifications(data: GetNotificationsRequest): Observable<GetNotificationsResponse>;
  MarkAsRead(data: MarkAsReadRequest): Observable<NotificationResponse>;
  DeleteNotification(data: DeleteNotificationRequest): Observable<Empty>;
  SubscribeToNotifications(data: SubscribeRequest): Observable<NotificationResponse>;
}

export interface SendNotificationRequest {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: string;
}

export interface GetNotificationsRequest {
  userId: string;
  page: number;
  limit: number;
  unreadOnly?: boolean;
}

export interface GetNotificationsResponse {
  notifications: NotificationResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface MarkAsReadRequest {
  notificationId: string;
  userId: string;
}

export interface DeleteNotificationRequest {
  notificationId: string;
  userId: string;
}

export interface SubscribeRequest {
  userId: string;
}

export interface NotificationResponse {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  metadata: string;
  createdAt: string;
  updatedAt: string;
}

export interface Empty {}

export enum NotificationType {
  INFO = 0,
  WARNING = 1,
  ERROR = 2,
  SUCCESS = 3,
}