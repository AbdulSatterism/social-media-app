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
    image: { fileType: 'images', size: 5 * 1024 * 1024 }, // 5MB
    thumbnail: { fileType: 'thumbnails', size: 20 * 1024 * 1024 }, // 20MB
    video: { fileType: 'videos', size: 100 * 1024 * 1024 }, // 100MB
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
    image: { fileType: 'images', size: 50 * 1024 * 1024 }, // 5MB
    video: { fileType: 'videos', size: 1000 * 1024 * 1024 }, // 100MB
  }),
  MessageController.sendtMessage,
);

router.patch(
  '/view-status/:messageId',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  MessageController.updateMessageViewStatus,
);

export const MessageRoutes = router;
