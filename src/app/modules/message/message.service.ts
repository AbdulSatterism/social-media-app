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
  } = payload;
  let media = '';

  if (contentType === 'image') {
    media = image;
  } else if (contentType === 'video') {
    media = video;
  }

  const isUserExist = await User.isExistUserById(senderId)
    .select('name image _id')
    .populate('sender', 'name image _id');
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
  // Send push notifications to all chat participants
  for (const chatId of chatIds) {
    const chatExist = await Chat.findById(chatId);

    if (!chatExist) continue; // Skip if chat doesn't exist

    // Get receiver id (exclude sender from chat members)
    const receiverId = chatExist.members.find(
      memberId => memberId.toString() !== senderId,
    );

    if (!receiverId) continue; // Skip if no receiver found

    const user = await User.findById(receiverId);

    if (!user) continue; // Skip if user not found

    // Send push notification
    const pushMessage = `${(isUserExist?.sender as any)?.name} sent you a new message`;
    await sendPushNotification(
      user?.playerId as string[],
      user?.phone,
      pushMessage,
    );
  }

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
