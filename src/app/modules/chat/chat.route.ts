import { Router } from 'express';
import { ChatController } from './chat.controller';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import fileUploader from '../../middlewares/fileUploader';
import { cacheGet } from '../../middlewares/casheGet';

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
  cacheGet('chats:private-list', 3600, req => ({ q: req.query })),
  ChatController.chatListWithLastMessage,
);
router.get(
  '/group-chat-list',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  cacheGet('chats:group-list', 3600, req => ({ q: req.query })),
  ChatController.chatListWithGroupLastMessage,
);

router.patch(
  '/update-group/:chatId',
  fileUploader({ image: { fileType: 'images', size: 10 * 1024 * 1024 } }),
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  ChatController.updateGroup,
);

router.get(
  '/group-chat/:chatId',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  cacheGet('chats:group-details', 3600, req => ({ params: req.params })),
  ChatController.getGroupChatDetails,
);

router.get(
  '/chat-inbox/:chatId',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  cacheGet('chats:inbox-messages', 3600, req => ({ q: req.query })),
  ChatController.getChatInboxMessages,
);

router.delete(
  '/delete-chat/:chatId',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  ChatController.deleteGroupChat,
);

export const ChatRoutes = router;
