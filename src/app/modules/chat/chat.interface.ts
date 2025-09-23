import { Types } from 'mongoose';

export interface IChat {
  type: 'private' | 'group';
  members: Types.ObjectId[];
  createdBy: Types.ObjectId;
}
