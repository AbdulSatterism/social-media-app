import { Types } from 'mongoose';

export interface IMessage {
  chat: Types.ObjectId;
  sender: Types.ObjectId;
  message?: string;
  media?: string;
  contentType: 'text' | 'image' | 'video';
}
