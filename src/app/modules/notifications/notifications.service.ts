/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import { Notification } from './notifications.model';
import AppError from '../../errors/AppError';

// my all notification

const getMyAllNotifications = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const { page, limit } = query;
  const pages = parseInt(page as string) || 1;
  const size = parseInt(limit as string) || 10;
  const skip = (pages - 1) * size;

  const [result, total] = await Promise.all([
    Notification.find({ receiverId: userId })
      .populate('senderId', { name: 1, _id: 0 })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size)
      .lean(),
    Notification.countDocuments({ receiverId: userId }),
  ]);

  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Notification not found!');
  }
  const totalPage = Math.ceil(total / size);
  return {
    data: result,
    meta: {
      page: pages,
      limit: size,
      totalPage,
      total,
    },
  };
};

// delete my notification
const deleteNotification = async (notificationId: string, userId: string) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    receiverId: userId,
  });
  if (!notification) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Notification not found');
  }

  return notification;
};

export const NotificationService = {
  getMyAllNotifications,
  deleteNotification,
};
