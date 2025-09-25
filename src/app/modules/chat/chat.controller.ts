import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ChatService } from './chat.services';

const createPrivateChat = catchAsync(async (req, res) => {
  const { participantId } = req.body;
  const creatorId = req?.user?.id;
  const result = await ChatService.createPrivateChat(creatorId, participantId);
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

export const ChatController = {
  createPrivateChat,
  createGroupChat,
};
