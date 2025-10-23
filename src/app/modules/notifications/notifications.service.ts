/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import { AdminNotification, Notification } from './notifications.model';
import AppError from '../../errors/AppError';
import { sendSMS } from '../../../util/verifyByTwilio';

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
      .populate('senderId', { name: 1, image: 1, _id: 0 })
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

// admin notificaitoin get all, get single, update read status, delete by admin

const getAllAdminNotification = async (query: Record<string, unknown>) => {
  const { page, limit } = query;
  const pages = parseInt(page as string) || 1;
  const size = parseInt(limit as string) || 10;
  const skip = (pages - 1) * size;

  const [result, total] = await Promise.all([
    AdminNotification.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size)
      .lean(),
    AdminNotification.countDocuments(),
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

// find single notification and update read status
const getSingleNotification = async (id: string) => {
  const notification = await AdminNotification.findByIdAndUpdate(
    id,
    { read: true },
    { new: true },
  ).lean();

  if (!notification) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Notification not found');
  }

  return notification;
};

// delete notification by admin
const deleteNotificationByAdmin = async (id: string) => {
  const notification = await AdminNotification.findByIdAndDelete(id);
  if (!notification) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Notification not found');
  }
  return notification;
};

// send message by the admin dashboard by phone number and message

const sendInboxMessageByAdmin = async (payload: {
  phone: string;
  message: string;
}) => {
  const { phone, message } = payload;
  const result = await sendSMS(phone, message);
  return result;
};

export const NotificationService = {
  getMyAllNotifications,
  deleteNotification,
  getAllAdminNotification,
  getSingleNotification,
  deleteNotificationByAdmin,
  sendInboxMessageByAdmin,
};
