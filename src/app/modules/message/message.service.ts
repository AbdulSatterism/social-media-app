/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import { Message } from './message.model';
import { User } from '../user/user.model';
import { Chat } from '../chat/chat.model';

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

// send  message in multiple  chat inbox

const sendMessage = async (payload: any) => {
  const {
    senderId,
    chatIds,
    message,
    image,
    video,
    thumbnail,
    contentType,
    reaction,
  } = payload;
  let media = '';

  if (contentType === 'image') {
    media = image;
  } else if (contentType === 'video') {
    media = video;
  }

  const isUserExist = await User.isExistUserById(senderId);
  if (!isUserExist) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const chats = await Chat.find({ _id: { $in: chatIds } });
  if (chats.length !== chatIds.length) {
    throw new AppError(StatusCodes.NOT_FOUND, 'One or more chat(s) not found');
  }

  // 4️⃣ Create message objects for each chat
  const newMessages = chatIds.map((chatId: string) => ({
    chat: chatId,
    sender: senderId,
    message,
    thumbnail,
    media,
    contentType,
    reaction,
  }));

  // 5️⃣ Insert all at once (for multiple chats)
  const result = await Message.insertMany(newMessages);
  return result;
};

// update message view status
const updateMessageViewStatus = async (messageId: string) => {
  const message = await Message.findById(messageId);
  if (!message) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Message not found');
  }

  message.view = true;
  await message.save();

  return message;
};

export const MessageService = {
  deleteMessageBySender,
  sendMessage,
  updateMessageViewStatus,
};
