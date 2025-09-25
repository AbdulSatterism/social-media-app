import { Router } from 'express';
import { ChatController } from './chat.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';

const router = Router();

router.post(
  '/create-private',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  ChatController.createPrivateChat,
);

router.post(
  '/create-group',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  ChatController.createGroupChat,
);

router.post(
  '/add-members',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  ChatController.addMembersToGroupChat,
);

router.post(
  '/remove-member',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  ChatController.removeMemberFromGroupChatByCreator,
);

router.post(
  '/leave-group',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  ChatController.leaveGroupChat,
);

export const ChatRoutes = router;
