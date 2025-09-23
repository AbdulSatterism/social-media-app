import { model, Schema } from 'mongoose';
import { IChat } from './chat.interface';

const chatSchema = new Schema<IChat>(
  {
    type: { type: String, enum: ['private', 'group'], default: 'private' },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

// Ensure private chats have unique pairings of members
chatSchema.index(
  { type: 1, 'members.0': 1, 'members.1': 1 },
  { unique: true, partialFilterExpression: { type: 'private' } },
);

// Index for group chats based on members for efficient querying
chatSchema.index({ members: 1, updatedAt: -1 });

export const Chat = model<IChat>('Chat', chatSchema);
