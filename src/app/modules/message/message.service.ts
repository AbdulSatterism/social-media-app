/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import { Message } from './message.model';
import { User } from '../user/user.model';
import { Chat } from '../chat/chat.model';
import { sendPushNotification } from '../../../util/onesignal';

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
    image_ios,
    image_normal,
    video_ios,
    video_normal,
    thumbnail_ios,
    thumbnail_normal,
  } = payload;
  let media = '';

  let media_ios = '';
  let media_normal = '';

  if (contentType === 'image') {
    media = image || '';
    media_ios = image_ios || image || '';
    media_normal = image_normal || image || '';
  } else if (contentType === 'video') {
    media = video || '';
    media_ios = video_ios || video || '';
    media_normal = video_normal || video || '';
  }

  const isUserExist = await User.findById(senderId);

  if (!isUserExist) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const chats = await Chat.find({ _id: { $in: chatIds } });
  if (chats.length !== chatIds.length) {
    throw new AppError(StatusCodes.NOT_FOUND, 'One or more chat(s) not found');
  }

  const newMessages = chatIds.map((chatId: string) => ({
    chat: chatId,
    sender: senderId,
    message,
    thumbnail,
    media,
    media_ios,
    media_normal,
    thumbnail_ios: thumbnail_ios || '',
    thumbnail_normal: thumbnail_normal || '',
    contentType,
    reaction,
  }));

  const result = await Message.insertMany(newMessages);

  for (const chatId of chatIds) {
    const chatExist = await Chat.findById(chatId);

    if (!chatExist) continue;
    const receiverId = chatExist.members.find(
      memberId => memberId.toString() !== senderId,
    );

    if (!receiverId) continue;

    const user = await User.findById(receiverId);

    if (!user) continue;
    const pushMessage = `${(isUserExist as any)?.name} sent you a new message`;
    await sendPushNotification(
      user?.playerId as string[],
      user?.phone,
      pushMessage,
    );
  }

  return result;
};

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
