import { Types } from 'mongoose';

// export interface IStory {
//   video?: string;
//   image?: string;
//   contentType: 'image' | 'video';
//   author: Types.ObjectId;
//   expiryNotificationSent?: boolean;
// }

export interface IStory {
  video?: string;
  image?: string;
  contentType: 'image' | 'video';
  caption?: string;
  author: Types.ObjectId;
  expiryNotificationSent?: boolean;
  video_ios?: string;
  video_normal?: string;
  image_ios?: string;
  image_normal?: string;
}
