import { Types } from 'mongoose';

export interface IChat {
  type: 'private' | 'group';
  name?: string;
  members: Types.ObjectId[];
  createdBy: Types.ObjectId;
}
