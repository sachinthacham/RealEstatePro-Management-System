import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import * as notificationService from '../services/notification.service';

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, unreadOnly } = req.query;
    const result = await notificationService.listNotifications(
      req.user!._id.toString(),
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      unreadOnly === 'true'
    );

    res.status(200).json({
      success: true,
      data: result.notifications,
      unreadCount: result.unreadCount,
      pagination: { page: result.page, limit: limit ? Number(limit) : 20, total: result.total, totalPages: result.totalPages },
    });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await notificationService.markAsRead(req.user!._id.toString(), req.params.id as string);
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAllAsRead(req.user!._id.toString());
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

export const removeNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await notificationService.deleteNotification(req.user!._id.toString(), req.params.id as string);
    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};
