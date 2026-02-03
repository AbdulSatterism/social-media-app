import { model, Schema } from 'mongoose';
import { IStory } from './story.interface';

const storySchema = new Schema<IStory>(
  {
    image: { type: String, default: '' },
    video: { type: String, default: '' },
    contentType: { type: String, enum: ['image', 'video'], required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiryNotificationSent: { type: Boolean, default: false },
    video_ios: { type: String, default: '' },
    video_normal: { type: String, default: '' },
    image_ios: { type: String, default: '' },
    image_normal: { type: String, default: '' },
  },
  {
    timestamps: true,
  },
);

export const Story = model<IStory>('Story', storySchema);
