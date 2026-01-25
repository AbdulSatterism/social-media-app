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
    }, // 50MB
    thumbnail: {
      fileType: 'thumbnails',
      size: 200 * 1024 * 1024,
      returnType: 'url',
      delivery: 'original',
    }, // 200MB
    video: {
      fileType: 'videos',
      size: 1000 * 1024 * 1024,
      returnType: 'url',
      delivery: 'playback',
      hdrMode: 'pq',
    }, // 1000MB
  }),
  (req, res) => {
    const mediaUrl = req.body.image || req.body.video || req.body.thumbnail;
    res.status(200).json({ mediaUrl });
  },
);

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
    }, // 50MB
    video: {
      fileType: 'videos',
      size: 1000 * 1024 * 1024,
      returnType: 'url',
      delivery: 'playback',
      hdrMode: 'pq',
    }, // 1000MB
    thumbnail: {
      fileType: 'thumbnails',
      size: 200 * 1024 * 1024,
      returnType: 'url',
      delivery: 'original',
    }, // 200MB
  }),
  MessageController.sendtMessage,
);

router.patch(
  '/view-status/:messageId',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  MessageController.updateMessageViewStatus,
);

export const MessageRoutes = router;
