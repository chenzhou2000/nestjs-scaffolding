import { Test, TestingModule } from '@nestjs/testing';
import { GrpcNotificationService } from './grpc-notification.service';
import { NotificationType } from '../interfaces/notification-grpc.interface';

describe('GrpcNotificationService', () => {
  let service: GrpcNotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GrpcNotificationService],
    }).compile();

    service = module.get<GrpcNotificationService>(GrpcNotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendNotification', () => {
    it('should send a notification', async () => {
      const sendNotificationRequest = {
        userId: 'user-123',
        title: 'Test Notification',
        message: 'This is a test message',
        type: NotificationType.INFO,
        metadata: 'test metadata',
      };

      const result = await service.sendNotification(sendNotificationRequest);

      expect(result).toMatchObject({
        userId: sendNotificationRequest.userId,
        title: sendNotificationRequest.title,
        message: sendNotificationRequest.message,
        type: sendNotificationRequest.type,
        isRead: false,
        metadata: sendNotificationRequest.metadata,
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('getNotifications', () => {
    it('should get notifications for a user', async () => {
      // First send a notification
      await service.sendNotification({
        userId: 'user-123',
        title: 'Test Notification',
        message: 'This is a test message',
        type: NotificationType.INFO,
      });

      const result = await service.getNotifications({
        userId: 'user-123',
        page: 1,
        limit: 10,
      });

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].title).toBe('Test Notification');
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter unread notifications only', async () => {
      // Send a notification and mark it as read
      const notification = await service.sendNotification({
        userId: 'user-456',
        title: 'Read Notification',
        message: 'This will be marked as read',
        type: NotificationType.INFO,
      });

      await service.markAsRead({
        notificationId: notification.id,
        userId: 'user-456',
      });

      // Send another unread notification
      await service.sendNotification({
        userId: 'user-456',
        title: 'Unread Notification',
        message: 'This will remain unread',
        type: NotificationType.WARNING,
      });

      const result = await service.getNotifications({
        userId: 'user-456',
        page: 1,
        limit: 10,
        unreadOnly: true,
      });

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].title).toBe('Unread Notification');
      expect(result.notifications[0].isRead).toBe(false);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const notification = await service.sendNotification({
        userId: 'user-789',
        title: 'Test Notification',
        message: 'This will be marked as read',
        type: NotificationType.SUCCESS,
      });

      const result = await service.markAsRead({
        notificationId: notification.id,
        userId: 'user-789',
      });

      expect(result.isRead).toBe(true);
      expect(result.id).toBe(notification.id);
    });

    it('should throw error for unauthorized access', async () => {
      const notification = await service.sendNotification({
        userId: 'user-owner',
        title: 'Private Notification',
        message: 'Only owner can access',
        type: NotificationType.INFO,
      });

      await expect(
        service.markAsRead({
          notificationId: notification.id,
          userId: 'different-user',
        })
      ).rejects.toThrow('Unauthorized access to notification');
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      const notification = await service.sendNotification({
        userId: 'user-delete',
        title: 'To be deleted',
        message: 'This notification will be deleted',
        type: NotificationType.ERROR,
      });

      const result = await service.deleteNotification({
        notificationId: notification.id,
        userId: 'user-delete',
      });

      expect(result).toEqual({});

      // Verify notification is deleted
      const notifications = await service.getNotifications({
        userId: 'user-delete',
        page: 1,
        limit: 10,
      });

      expect(notifications.notifications).toHaveLength(0);
    });

    it('should throw error for unauthorized deletion', async () => {
      const notification = await service.sendNotification({
        userId: 'user-owner',
        title: 'Protected Notification',
        message: 'Only owner can delete',
        type: NotificationType.WARNING,
      });

      await expect(
        service.deleteNotification({
          notificationId: notification.id,
          userId: 'different-user',
        })
      ).rejects.toThrow('Unauthorized access to notification');
    });
  });
});