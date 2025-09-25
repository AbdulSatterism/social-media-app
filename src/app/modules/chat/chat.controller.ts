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

export const ChatController = {
  createPrivateChat,
  createGroupChat,
  addMembersToGroupChat,
  removeMemberFromGroupChatByCreator,
  leaveGroupChat,
};
