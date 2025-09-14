import { model, Schema } from 'mongoose';
import { TNotification } from './notifications.interface';

const notificationSchema = new Schema<TNotification>(
  {
    message: {
      type: String,
    },
    patientName: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export const Notification = model<TNotification>(
  'Notification',
  notificationSchema,
);
