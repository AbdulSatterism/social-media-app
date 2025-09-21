import { Types } from 'mongoose';

export interface IStory {
  video?: string;
  image?: string;
  contentType: 'image' | 'video';
  author: Types.ObjectId;
}
