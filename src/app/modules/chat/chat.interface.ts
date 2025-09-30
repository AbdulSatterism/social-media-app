import { Types } from 'mongoose';

export interface IChat {
  type: 'private' | 'group';
  name?: string;
  image?: string;
  members: Types.ObjectId[];
  createdBy: Types.ObjectId;
}
