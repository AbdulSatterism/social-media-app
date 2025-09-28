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

router.get(
  '/private-chat-list',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  ChatController.chatListWithLastMessage,
);
router.get(
  '/group-chat-list',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  ChatController.chatListWithGroupLastMessage,
);

router.patch(
  '/update-group-name',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  ChatController.updateGroupName,
);

router.get(
  '/group-chat/:chatId',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  ChatController.getGroupChatDetails,
);

export const ChatRoutes = router;
