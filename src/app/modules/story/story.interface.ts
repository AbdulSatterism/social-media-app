import { Types } from 'mongoose';

export interface IStory {
  content: string;
  author: Types.ObjectId;
}
