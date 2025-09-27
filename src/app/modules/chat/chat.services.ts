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
    name: 'private chat',
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

const createGroupChat = async (creatorId: string, members: string[]) => {
  if (!members || members.length === 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Group members are required');
  }

  const uniqueMembers = Array.from(new Set([...members, creatorId])); // Ensure creator is in the group
  const objectIdMembers = uniqueMembers.map(
    id => new mongoose.Types.ObjectId(id),
  );

  const chat = await Chat.create({
    type: 'group',
    name: 'group chat',
    members: objectIdMembers,
    createdBy: new mongoose.Types.ObjectId(creatorId),
  } as IChat);

  // when create group chat, need to create notification for all members except creator
  await Promise.all(
    uniqueMembers
      .filter(id => id !== creatorId)
      .map(participantId =>
        Notification.create({
          content: 'You have been added to a new group chat.',
          senderId: creatorId,
          receiverId: participantId,
        }),
      ),
  );

  return chat;
};

// add new member to group chat at a time one or more members can added by creator
const addMembersToGroupChat = async (
  chatId: string,
  adderId: string,
  newMembers: string[],
) => {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Chat not found');
  }
  if (chat.type !== 'group') {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Can only add members to group chats',
    );
  }
  if (chat.createdBy.toString() !== adderId) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      'Only the group creator can add members',
    );
  }

  // Filter out members who are already in the group
  const existingMemberIds = chat.members.map(m => m.toString());
  const uniqueNewMembers = newMembers.filter(
    id => !existingMemberIds.includes(id),
  );

  if (uniqueNewMembers.length === 0) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'All provided members are already in the group',
    );
  }

  // Add only unique new members
  const objectIdMembers = uniqueNewMembers.map(
    id => new mongoose.Types.ObjectId(id),
  );
  chat.members.push(...objectIdMembers);
  await chat.save();

  // Create notifications for the new members
  await Promise.all(
    uniqueNewMembers.map(participantId =>
      Notification.create({
        content: 'You have been added to a group chat.',
        senderId: adderId,
        receiverId: participantId,
      }),
    ),
  );

  return chat;
};

// remove member from group chat at a time one

const removeMemberFromGroupChatByCreator = async (
  chatId: string,
  removerId: string,
  memberId: string,
) => {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Chat not found');
  }
  if (chat.type !== 'group') {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Can only remove members from group chats',
    );
  }
  if (chat.createdBy.toString() !== removerId) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      'Only the group creator can remove members',
    );
  }

  // Remove the member from the group chat
  chat.members = chat.members.filter(member => member.toString() !== memberId);
  await chat.save();

  return chat;
};

// leave group chat by himself
const leaveGroupChat = async (chatId: string, memberId: string) => {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Chat not found');
  }
  if (chat.type !== 'group') {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Can only leave group chats');
  }
  const isMember = chat.members.some(member => member.toString() === memberId);
  if (!isMember) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'you are not available in this group',
    );
  }
  // Remove the member from the group chat
  chat.members = chat.members.filter(member => member.toString() !== memberId);
  await chat.save();
  return chat;
};

export const ChatService = {
  createPrivateChat,
  createGroupChat,
  addMembersToGroupChat,
  removeMemberFromGroupChatByCreator,
  leaveGroupChat,
};
