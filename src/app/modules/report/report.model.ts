import { model, Schema } from 'mongoose';
import { IReport } from './report.interface';

const reportSchema = new Schema<IReport>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true },
);

export const Report = model<IReport>('Report', reportSchema);
