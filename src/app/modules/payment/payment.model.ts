// /models/payment.model.ts
import mongoose, { Schema } from 'mongoose';
import { TPayment } from './paypment.inteface';

const paymentSchema = new Schema<TPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentId: {
      type: Schema.Types.ObjectId,
      ref: 'BookAppointment',
      required: true,
    },
    transactionId: { type: String, required: true },
    appointmentPrice: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED'],
      default: 'PENDING',
    },
  },
  {
    timestamps: true,
  },
);

export const Payment = mongoose.model<TPayment>('Payment', paymentSchema);
