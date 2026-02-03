import { Types } from 'mongoose';

export interface IStory {
  video?: string;
  image?: string;
  contentType: 'image' | 'video';
  author: Types.ObjectId;
  expiryNotificationSent?: boolean;
}

export interface IStory {
  video?: string;
  image?: string;
  contentType: 'image' | 'video';
  author: Types.ObjectId;
  expiryNotificationSent?: boolean;
  video_ios?: string; // iPhone (original master / HDR master)
  video_normal?: string; // Android/normal (SDR playback)
  image_ios?: string; // iPhone (original)
  image_normal?: string; // Android/normal (optimized)
}
