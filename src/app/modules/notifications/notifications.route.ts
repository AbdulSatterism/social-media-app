import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { NotificationController } from './notifications.controller';

const router = express.Router();

router.get(
  '/',
  auth(USER_ROLES.ADMIN),
  NotificationController.getAllNotification,
);

// router.get(
//   '/user-notification',
//   auth(USER_ROLES.USER, USER_ROLES.ADMIN),
//   NotificationController.getUserNotification,
// );

// router.get(
//   '/group-notification/:groupId',
//   auth(USER_ROLES.USER, USER_ROLES.ADMIN),
//   NotificationController.getGroupReceiverNotification,
// );

// router.patch(
//   '/',
//   auth(USER_ROLES.USER),
//   NotificationController.readNotification,
// );

// router.get(
//   '/admin',
//   auth(USER_ROLES.ADMIN),
//   NotificationController.adminNotificationFromDB,
// );

// router.patch(
//   '/admin',
//   auth(USER_ROLES.ADMIN),
//   NotificationController.adminReadNotification,
// );

// router.delete(
//   '/delete-all',
//   auth(USER_ROLES.ADMIN),
//   NotificationController.deleteAllNotifications,
// );

export const NotificationRoutes = router;
