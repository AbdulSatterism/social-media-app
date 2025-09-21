import { model, Schema } from 'mongoose';
import { IStory } from './story.interface';

const storySchema = new Schema<IStory>(
  {
    content: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
  },
);

export const Story = model<IStory>('Story', storySchema);
