import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import fileUploader from '../../middlewares/fileUploader';
const router = express.Router();

// Upload image/video
router.post(
  '/upload',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  fileUploader({
    image: { fileType: 'images', size: 5 * 1024 * 1024 }, // 5MB
    video: { fileType: 'videos', size: 100 * 1024 * 1024 }, // 100MB
  }),
  (req, res) => {
    const mediaUrl = req.body.image || req.body.video;
    res.status(200).json({ mediaUrl });
  },
);

export const MessageRoutes = router;
