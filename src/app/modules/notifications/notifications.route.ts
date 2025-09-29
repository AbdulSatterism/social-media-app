import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { NotificationController } from './notifications.controller';

const router = express.Router();

router.get(
  '/my-notifications',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  NotificationController.getMyAllNotifications,
);

router.delete(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  NotificationController.deleteNotification,
);

// admin notification

router.get(
  '/admin-notifications',
  auth(USER_ROLES.ADMIN),
  NotificationController.getAdminNotificaiton,
);

export const NotificationRoutes = router;
