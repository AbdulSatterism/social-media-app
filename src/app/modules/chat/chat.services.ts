import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import { IChat } from './chat.interface';
import sortMembers from '../../../util/sortMembers';
import { Chat } from './chat.model';
import mongoose from 'mongoose';
import { Notification } from '../notifications/notifications.model';
import { User } from '../user/user.model';
import { Message } from '../message/message.model';
import unlinkFile from '../../../shared/unlinkFile';
import { sendPushNotification } from '../../../util/onesignal';

const createPrivateChat = async (creatorId: string, participantId: string) => {
  if (creatorId === participantId) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Cannot create a chat with yourself.',
    );
  }

  // Sort the member pair to enforce consistent ordering
  const [a, b] = sortMembers(creatorId, participantId);
  const objectIdA = new mongoose.Types.ObjectId(a);
  const objectIdB = new mongoose.Types.ObjectId(b);

  // Try to find existing private chat (members are stored in sorted order)
  const existingChat = await Chat.findOne({
    type: 'private',
    'members.0': objectIdA,
    'members.1': objectIdB,
  });

  if (existingChat) return existingChat;

  // Verify both users exist before creating chat
  const [creator, participant] = await Promise.all([
    User.findById(creatorId),
    User.findById(participantId),
  ]);

  if (!creator || !participant) {
    throw new AppError(StatusCodes.NOT_FOUND, 'One or both users not found');
  }

  const chat = await Chat.create({
    type: 'private',
    name: 'private chat',
    members: [objectIdA, objectIdB],
    createdBy: new mongoose.Types.ObjectId(creatorId),
  } as IChat);

  // Create a notification for the participant
  await Notification.create({
    content: `${creator?.name} just joined re:`,
    senderId: creatorId,
    receiverId: participantId,
  });

  // send sms with phone number
  const message = `${creator?.name} just joined re:`;
  await sendPushNotification(
    participant?.playerId as string[],
    participant?.phone,
    message,
  );
  // await sendSMS(participant?.phone, message);

  return chat;
};

const createGroupChat = async (creatorId: string, members: string[]) => {
  if (!members || members.length === 0) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Group members are required');
  }

  const creatorExists = await User.isExistUserById(creatorId);
  if (!creatorExists) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Creator user not found');
  }

  const uniqueMembers = Array.from(new Set([...members, creatorId])); // Ensure creator is in the group
  const objectIdMembers = uniqueMembers.map(
    id => new mongoose.Types.ObjectId(id),
  );

  const chat = await Chat.create({
    type: 'group',
    name: creatorExists.name,
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

// for private chat list with last message

const chatListWithLastMessage = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  // ✅ Check user existence
  const isUserExist = await User.isExistUserById(userId);
  if (!isUserExist) {
    throw new AppError(StatusCodes.NOT_FOUND, 'user not found');
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const chats = await Chat.aggregate([
    {
      $match: {
        members: userObjectId,
      },
    },
    {
      $sort: { updatedAt: -1 },
    },
    { $skip: skip },
    { $limit: limit },

    // ✅ Lookup last message
    {
      $lookup: {
        from: 'messages',
        let: { chatId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$chat', '$$chatId'] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
        ],
        as: 'lastMessage',
      },
    },
    {
      $addFields: {
        lastMessage: { $arrayElemAt: ['$lastMessage', 0] },
      },
    },

    // ✅ Conditionally populate members only for private chats
    {
      $lookup: {
        from: 'users',
        let: { memberIds: '$members' },
        pipeline: [
          { $match: { $expr: { $in: ['$_id', '$$memberIds'] } } },
          {
            $project: {
              _id: 1,
              name: 1,
              image: 1,
            },
          },
        ],
        as: 'populatedMembers',
      },
    },
    {
      $addFields: {
        members: '$populatedMembers',
      },
    },
    {
      $project: {
        populatedMembers: 0, // remove temp field
      },
    },
  ]);

  // ✅ Pagination
  const total = await Chat.countDocuments({
    members: userObjectId,
  });
  const totalPage = Math.ceil(total / limit);

  return {
    data: chats,
    meta: {
      page,
      limit,
      totalPage,
      total,
    },
  };
};

// for group chat list with last message

const groupChatListWithLastMessage = async (
  userId: string,
  query: Record<string, unknown>,
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const isUserExist = await User.isExistUserById(userId);
  if (!isUserExist) {
    throw new AppError(StatusCodes.NOT_FOUND, 'user not found');
  }
  const userObjectId = new mongoose.Types.ObjectId(userId);
  // Fetch group chats where the user is a member, include last message if exists
  const chats = await Chat.aggregate([
    {
      $match: {
        type: 'group',
        members: userObjectId,
      },
    },
    {
      $sort: { updatedAt: -1 },
    },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'messages',
        let: { chat: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$chat', '$$chat'] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
        ],
        as: 'lastMessage',
      },
    },
    {
      $addFields: {
        lastMessage: { $arrayElemAt: ['$lastMessage', 0] },
      },
    },
    // No $match for lastMessage, so chats without messages are also included
    {
      $project: {
        members: 0,
      },
    },
  ]);

  // Get total count for pagination
  const total = await Chat.countDocuments({
    type: 'group',
    members: userObjectId,
  });
  const totalPage = Math.ceil(total / limit);

  return {
    data: chats,
    meta: {
      page,
      limit,
      totalPage,
      total,
    },
  };
};

// update name if group chat

const updateGroup = async (
  userId: string,
  chatId: string,
  payload: Partial<IChat>,
) => {
  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Chat not found');
  }
  if (chat.type !== 'group') {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Can only update name for group chats',
    );
  }
  const isMember = chat?.members?.some(member => member.toString() === userId);
  if (!isMember) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      'You are not a member of this group',
    );
  }

  if (payload.image && chat.image) {
    unlinkFile(chat.image);
  }

  const updatedChat = await Chat.findOneAndUpdate({ _id: chatId }, payload, {
    new: true,
  });
  return updatedChat;
};

// single group with member details

const getGroupChatDetails = async (userId: string, chatId: string) => {
  const chat = await Chat.findById(chatId).populate(
    'members',
    'name email image',
  );
  if (!chat) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Chat not found');
  }
  if (chat.type !== 'group') {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Can only get details for group chats',
    );
  }
  const isMember = chat?.members?.some(
    member => member._id.toString() === userId,
  );
  if (!isMember) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      'You are not a member of this group',
    );
  }
  return chat;
};

// chat inbox all message with pagination

const getChatInboxMessages = async (
  userId: string,
  chatId: string,
  query: Record<string, unknown>,
) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const isUserExist = await User.isExistUserById(userId);
  if (!isUserExist) {
    throw new AppError(StatusCodes.NOT_FOUND, 'user not found');
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Chat not found');
  }

  const isMember = chat.members.some(
    (member: mongoose.Types.ObjectId) => member.toString() === userId,
  );
  if (!isMember) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      'You are not a member of this chat',
    );
  }

  // Fetch messages for the chat with pagination
  const messages = await Message.find({ chat: chatId })
    .skip(skip)
    .limit(limit)
    .populate('sender', 'name image _id')
    .sort({ createdAt: -1 });

  // update message read status when user fetch the messages

  await Message.updateMany(
    { chat: chatId, isRead: false },
    { $set: { isRead: true } },
  );

  // Get total count for pagination
  const total = await Message.countDocuments({ chat: chatId });
  const totalPage = Math.ceil(total / limit);

  return {
    data: messages,
    meta: {
      page,
      limit,
      totalPage,
      total,
    },
  };
};

// group deleted by creator

const deleteGroupChat = async (userId: string, chatId: string) => {
  const [user, chat] = await Promise.all([
    User.findById(userId),
    Chat.findById(chatId),
  ]);

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found');
  }
  if (!chat) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Chat not found');
  }

  if (chat.type === 'group') {
    if (chat.createdBy.toString() !== userId) {
      throw new AppError(
        StatusCodes.FORBIDDEN,
        'Only the group creator can delete the group chat',
      );
    }
  }

  await Chat.findByIdAndDelete(chatId);
  return chat;
};

export const ChatService = {
  createPrivateChat,
  createGroupChat,
  addMembersToGroupChat,
  removeMemberFromGroupChatByCreator,
  leaveGroupChat,
  groupChatListWithLastMessage,
  chatListWithLastMessage,
  updateGroup,
  getGroupChatDetails,
  getChatInboxMessages,
  deleteGroupChat,
};
