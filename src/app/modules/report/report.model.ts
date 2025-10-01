import { model, Schema } from 'mongoose';
import { IReport } from './report.interface';

const reportSchema = new Schema<IReport>(
  {
    name: { type: String, required: false, default: '' },
    phone: { type: String, required: false, default: '' },
    email: { type: String, required: false, default: '' },
    content: { type: String, required: false, default: '' },
  },
  { timestamps: true },
);

export const Report = model<IReport>('Report', reportSchema);
