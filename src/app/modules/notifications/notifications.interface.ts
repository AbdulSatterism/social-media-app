import { Types } from 'mongoose';

export interface INotification {
  senderId: Types.ObjectId;
  receiverId: Types.ObjectId;
  content?: string;
}

// also notification interface for when user register admin can see his informantion in notification

export interface IAdminNotification {
  content: string;
  read: boolean;
}
