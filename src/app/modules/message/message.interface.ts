import { Types } from 'mongoose';

export interface IMessage {
  chat: Types.ObjectId;
  sender: Types.ObjectId;
  view?: boolean;
  message?: string;
  media?: string;
  contentType: 'text' | 'image' | 'video';
}
