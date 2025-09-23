import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import { IChat } from './chat.interface';
import sortMembers from '../../../util/sortMembers';
import { Chat } from './chat.model';
import mongoose from 'mongoose';
import { Notification } from '../notifications/notifications.model';

const createPrivateChat = async (creatorId: string, participantId: string) => {
  if (creatorId === participantId) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Cannot create a chat with yourself.',
    );
  }

  // Sort the member pair to enforce consistent ordering
  const [a, b] = sortMembers(creatorId, participantId);

  const existingChat = await Chat.findOne({
    type: 'private',
    'members.0': a,
    'members.1': b,
  });

  if (existingChat) return existingChat;

  const chat = await Chat.create({
    type: 'private',
    members: [new mongoose.Types.ObjectId(a), new mongoose.Types.ObjectId(b)],
    createdBy: new mongoose.Types.ObjectId(creatorId),
  } as IChat);

  // Create a notification for the participant

  await Notification.create({
    content: "Want's to talk with you.",
    senderId: creatorId,
    receiverId: participantId,
  });

  return chat;
};

export const ChatService = {
  createPrivateChat,
};
