import { model, Schema } from 'mongoose';
import { IAdminNotification, INotification } from './notifications.interface';

const notificationSchema = new Schema<INotification>(
  {
    content: {
      type: String,
      default: '',
    },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  },
);

const adminNotificationSchema = new Schema<IAdminNotification>(
  {
    content: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export const Notification = model<INotification>(
  'Notification',
  notificationSchema,
);

export const AdminNotification = model<IAdminNotification>(
  'AdminNotification',
  adminNotificationSchema,
);
