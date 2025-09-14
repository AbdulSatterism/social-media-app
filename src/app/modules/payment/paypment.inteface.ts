// /interfaces/payment.interface.ts
import { Types } from 'mongoose';

export type TPayment = {
  userId: Types.ObjectId;
  appointmentId: Types.ObjectId;
  transactionId: string;
  appointmentPrice: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
};
