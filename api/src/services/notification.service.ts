import { Types } from 'mongoose';
import Notification, { NotificationType } from '../models/notification.model';
import User from '../models/User.model';
import { AppError } from '../utils/appError';

interface NotifyInput {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/** Create a notification for a single user. */
export async function notifyUser(recipientId: string | Types.ObjectId, input: NotifyInput) {
  return Notification.create({ recipient: recipientId, ...input });
}

/** Create the same notification for every active admin (e.g. new listing to review). */
export async function notifyAdmins(input: NotifyInput) {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  if (!admins.length) return [];
  return Notification.insertMany(admins.map((admin) => ({ recipient: admin._id, ...input })));
}

export async function listNotifications(userId: string, page = 1, limit = 20, unreadOnly = false) {
  const query: Record<string, unknown> = { recipient: userId };
  if (unreadOnly) query.isRead = false;

  const pageNumber = Math.max(1, Number(page));
  const limitNumber = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNumber - 1) * limitNumber;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNumber),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipient: userId, isRead: false }),
  ]);

  return {
    notifications,
    total,
    unreadCount,
    page: pageNumber,
    totalPages: Math.ceil(total / limitNumber),
  };
}

export async function markAsRead(userId: string, notificationId: string) {
  if (!Types.ObjectId.isValid(notificationId)) throw new AppError('Invalid notification id', 400);

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { $set: { isRead: true } },
    { new: true }
  );

  if (!notification) throw new AppError('Notification not found', 404);
  return notification;
}

export async function markAllAsRead(userId: string) {
  await Notification.updateMany({ recipient: userId, isRead: false }, { $set: { isRead: true } });
}

export async function deleteNotification(userId: string, notificationId: string) {
  if (!Types.ObjectId.isValid(notificationId)) throw new AppError('Invalid notification id', 400);
  const result = await Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
  if (!result) throw new AppError('Notification not found', 404);
}
