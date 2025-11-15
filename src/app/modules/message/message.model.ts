import { model, Schema } from 'mongoose';
import { IMessage } from './message.interface';

const messageSchema = new Schema<IMessage>(
  {
    chat: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, default: '' },
    view: { type: Boolean, default: false },
    thumbnail: { type: String, default: '' },
    media: { type: String, default: '' },
    contentType: {
      type: String,
      enum: ['text', 'image', 'video'],
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

export const Message = model<IMessage>('Message', messageSchema);
