import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ChatService } from './chat.services';

const createPrivateChat = catchAsync(async (req, res) => {
  const { member } = req.body;
  const creatorId = req?.user?.id;
  const result = await ChatService.createPrivateChat(creatorId, member);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'chat created successfully',
    data: result,
  });
});

const createGroupChat = catchAsync(async (req, res) => {
  const { members } = req.body;

  const creatorId = req?.user?.id;
  const result = await ChatService.createGroupChat(creatorId, members);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'group chat created successfully',
    data: result,
  });
});

const addMembersToGroupChat = catchAsync(async (req, res) => {
  const { chatId, newMembers } = req.body;
  const membersArray = Array.isArray(newMembers) ? newMembers : [newMembers];
  const adderId = req?.user?.id;
  const result = await ChatService.addMembersToGroupChat(
    chatId,
    adderId,
    membersArray,
  );
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Members added to group chat successfully',
    data: result,
  });
});

const removeMemberFromGroupChatByCreator = catchAsync(async (req, res) => {
  const { groupId, memberId } = req.body;
  const creatorId = req?.user?.id;
  const result = await ChatService.removeMemberFromGroupChatByCreator(
    groupId,
    creatorId,
    memberId,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Member removed from group chat successfully',
    data: result,
  });
});

const leaveGroupChat = catchAsync(async (req, res) => {
  const { groupId } = req.body;
  const memberId = req?.user?.id;
  const result = await ChatService.leaveGroupChat(groupId, memberId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Left group chat successfully',
    data: result,
  });
});

const chatListWithLastMessage = catchAsync(async (req, res) => {
  const userId = req?.user?.id;
  const result = await ChatService.chatListWithLastMessage(userId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Fetched chat list with last message successfully',
    meta: {
      page: result.meta.page,
      limit: result.meta.limit,
      totalPage: result.meta.totalPage,
      total: result.meta.total,
    },
    data: result.data,
  });
});

const chatListWithGroupLastMessage = catchAsync(async (req, res) => {
  const userId = req?.user?.id;
  const result = await ChatService.groupChatListWithLastMessage(
    userId,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Fetched group chat list with last message successfully',
    meta: {
      page: result.meta.page,
      limit: result.meta.limit,
      totalPage: result.meta.totalPage,
      total: result.meta.total,
    },
    data: result.data,
  });
});

const updateGroup = catchAsync(async (req, res) => {
  const result = await ChatService.updateGroup(
    req.user.id,
    req.params.chatId,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Group name updated successfully',
    data: result,
  });
});

const getGroupChatDetails = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const result = await ChatService.getGroupChatDetails(req.user.id, chatId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Fetched group chat details successfully',
    data: result,
  });
});

const getChatInboxMessages = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;
  const result = await ChatService.getChatInboxMessages(
    userId,
    chatId,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Fetched chat inbox messages successfully',
    meta: {
      page: result.meta.page,
      limit: result.meta.limit,
      totalPage: result.meta.totalPage,
      total: result.meta.total,
    },
    data: result.data,
  });
});

const deleteGroupChat = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const chatId = req.params.chatId;
  const result = await ChatService.deleteGroupChat(userId, chatId);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Group deleted successfully',
    data: result,
  });
});

export const ChatController = {
  createPrivateChat,
  createGroupChat,
  addMembersToGroupChat,
  removeMemberFromGroupChatByCreator,
  leaveGroupChat,
  chatListWithLastMessage,
  chatListWithGroupLastMessage,
  updateGroup,
  getGroupChatDetails,
  getChatInboxMessages,
  deleteGroupChat,
};
