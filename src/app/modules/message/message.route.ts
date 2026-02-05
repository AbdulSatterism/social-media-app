import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import fileUploader from '../../middlewares/fileUploader';
import { MessageController } from './message.controller';

const router = express.Router();

// Upload image/video

router.post(
  '/upload',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  fileUploader({
    image: {
      fileType: 'images',
      size: 50 * 1024 * 1024,
      returnType: 'url',
      delivery: 'original',
      platformVariants: true,
    },
    thumbnail: {
      fileType: 'thumbnails',
      size: 200 * 1024 * 1024,
      returnType: 'url',
      delivery: 'original',
      platformVariants: true,
    },
    video: {
      fileType: 'videos',
      size: 1000 * 1024 * 1024,
      returnType: 'url',
      delivery: 'playback',
      platformVariants: true,
    },
  }),
  (req, res) => {
    const isVideo = !!req.body.video;
    const isImage = !!req.body.image;
    const isThumb = !!req.body.thumbnail;
    const mediaUrl =
      req.body.video || req.body.image || req.body.thumbnail || '';
    const media_ios = isVideo
      ? req.body.video_ios || ''
      : isImage
        ? req.body.image_ios || ''
        : isThumb
          ? req.body.thumbnail_ios || ''
          : '';

    const media_normal = isVideo
      ? req.body.video_normal || ''
      : isImage
        ? req.body.image_normal || ''
        : isThumb
          ? req.body.thumbnail_normal || ''
          : '';
    const thumbnail_ios = req.body.thumbnail_ios || '';
    const thumbnail_normal = req.body.thumbnail_normal || '';

    res.status(200).json({
      mediaUrl,
      media_ios,
      media_normal,
      thumbnail_ios,
      thumbnail_normal,
    });
  },
);

// router.post(
//   '/upload',
//   auth(USER_ROLES.USER, USER_ROLES.ADMIN),
//   fileUploader({
//     image: {
//       fileType: 'images',
//       size: 50 * 1024 * 1024,
//       returnType: 'url',
//       delivery: 'original',
//       platformVariants: true,
//     }, // 50MB
//     thumbnail: {
//       fileType: 'thumbnails',
//       size: 200 * 1024 * 1024,
//       returnType: 'url',
//       delivery: 'original',
//       platformVariants: true,
//     }, // 200MB
//     video: {
//       fileType: 'videos',
//       size: 1000 * 1024 * 1024,
//       returnType: 'url',
//       delivery: 'playback',
//       platformVariants: true,
//     }, // 1000MB
//   }),
//   (req, res) => {
//     const mediaUrl = req.body.image || req.body.video || req.body.thumbnail;
//     const media_ios = req.body.media_ios || '';
//     const media_normal = req.body.media_normal || '';
//     const thumbnail_ios = req.body.thumbnail_ios || '';
//     const thumbnail_normal = req.body.thumbnail_normal || '';
//     res
//       .status(200)
//       .json({
//         mediaUrl,
//         media_ios,
//         media_normal,
//         thumbnail_ios,
//         thumbnail_normal,
//       });
//   },
// );

router.delete(
  '/delete/:messageId',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  MessageController.deleteMessageBySender,
);

router.post(
  '/send-message',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  fileUploader({
    image: {
      fileType: 'images',
      size: 50 * 1024 * 1024,
      returnType: 'url',
      delivery: 'original',
      platformVariants: true,
    }, // 50MB
    video: {
      fileType: 'videos',
      size: 1000 * 1024 * 1024,
      returnType: 'url',
      delivery: 'playback',
      platformVariants: true,
    }, // 1000MB
    thumbnail: {
      fileType: 'thumbnails',
      size: 200 * 1024 * 1024,
      returnType: 'url',
      delivery: 'original',
      platformVariants: true,
    }, // 200MB
  }),
  MessageController.sendMessage,
);

router.patch(
  '/view-status/:messageId',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  MessageController.updateMessageViewStatus,
);

export const MessageRoutes = router;
