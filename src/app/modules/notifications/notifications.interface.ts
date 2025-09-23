import { Types } from 'mongoose';

export interface INotification {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  content?: string;
}
