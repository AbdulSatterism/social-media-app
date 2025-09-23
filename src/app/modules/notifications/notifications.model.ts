import { model, Schema } from 'mongoose';
import { INotification } from './notifications.interface';

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

export const Notification = model<INotification>(
  'Notification',
  notificationSchema,
);
