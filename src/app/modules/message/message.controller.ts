import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { MessageService } from './message.service';

const deleteMessageBySender = catchAsync(async (req, res) => {
  const { messageId } = req.params;
  const senderId = req.user.id;

  const result = await MessageService.deleteMessageBySender(
    messageId,
    senderId,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Message deleted successfully',
    data: result,
  });
});

const sendtMessage = catchAsync(async (req, res) => {
  const result = await MessageService.sendMessage(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Message sent successfully',
    data: result,
  });
});

export const MessageController = {
  deleteMessageBySender,
  sendtMessage,
};
