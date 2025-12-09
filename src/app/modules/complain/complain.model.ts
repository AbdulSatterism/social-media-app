import { model, Schema } from 'mongoose';
import { IComplain } from './complain.interface';

const reportSchema = new Schema<IComplain>(
  {
    repoter: { type: String, required: true },
    repoted: { type: String, required: true },
  },
  { timestamps: true },
);

export const Complain = model<IComplain>('Complain', reportSchema);
