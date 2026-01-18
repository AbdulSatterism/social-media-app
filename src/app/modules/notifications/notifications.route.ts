import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { NotificationController } from './notifications.controller';
import { cacheGet } from '../../middlewares/casheGet';

const router = express.Router();

router.get(
  '/my-notifications',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  cacheGet('notifications:all', 3600, req => ({ q: req.query })),
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
  cacheGet('notifications:admin', 3600, req => ({ q: req.query })),
  NotificationController.getAdminNotificaiton,
);

router.patch(
  '/admin-notification/:id',
  auth(USER_ROLES.ADMIN),
  cacheGet('notifications:admin-notification', 3600, req => ({
    params: req.params,
  })),
  NotificationController.getSingleNotification,
);

router.delete(
  '/admin-notification/:id',
  auth(USER_ROLES.ADMIN),
  NotificationController.deleteNotificationByAdmin,
);

router.post(
  '/admin-notification/send-inbox-message',
  auth(USER_ROLES.ADMIN),
  NotificationController.sendInboxMessageByAdmin,
);

export const NotificationRoutes = router;
