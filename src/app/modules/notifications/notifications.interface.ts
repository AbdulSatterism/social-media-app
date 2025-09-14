import { Model } from 'mongoose';

export interface TNotification {
  patientName: string;
  message: string;
}
export type Notification = Model<TNotification>;
