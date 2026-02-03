import { Types } from 'mongoose';

export interface IMessage {
  chat: Types.ObjectId;
  sender: Types.ObjectId;
  view?: boolean;
  reaction?: boolean;
  message?: string;
  media?: string;
  thumbnail?: string;
  media_ios?: string;
  media_normal?: string;
  thumbnail_ios?: string;
  thumbnail_normal?: string;
  contentType: 'text' | 'image' | 'video';
  read?: boolean;
}
