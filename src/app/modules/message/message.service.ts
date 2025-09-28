import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import { Message } from './message.model';
import { User } from '../user/user.model';

// delete single message by  sender

const deleteMessageBySender = async (messageId: string, senderId: string) => {
  const isUserExist = await User.isExistUserById(senderId);
  if (!isUserExist) {
    throw new AppError(StatusCodes.NOT_FOUND, 'user not found');
  }

  const message = await Message.findById(messageId);

  if (!message) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Message not found');
  }

  if (message.sender.toString() !== senderId) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      'You can only delete your own messages',
    );
  }

  const result = await Message.findByIdAndDelete(messageId, { new: true });

  return result;
};

export const MessageService = {
  deleteMessageBySender,
};
