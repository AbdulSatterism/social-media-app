import { Types } from 'mongoose';

export interface IMessage {
  chat: Types.ObjectId;
  sender: Types.ObjectId;
  view?: boolean;
  reaction?: boolean;
  message?: string;
  media?: string;
  thumbnail?: string;
  contentType: 'text' | 'image' | 'video';
  read?: boolean;
}
