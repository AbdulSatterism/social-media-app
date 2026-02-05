/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import colors from 'colors';
import { Server } from 'socket.io';
import { logger } from '../shared/logger';
import { Message } from '../app/modules/message/message.model';
import AppError from '../app/errors/AppError';
import { StatusCodes } from 'http-status-codes';
import { Chat } from '../app/modules/chat/chat.model';
import { User } from '../app/modules/user/user.model';
import { sendPushNotification } from '../util/onesignal';

const socket = (io: Server) => {
  io.on('connection', socket => {
    console.log('A user connected:', socket.id);

    // Join a chat room
    socket.on('join', chat => {
      socket.join(chat);
      console.log(`User joined room: ${chat}`);
    });

    socket.on(
      'send-message',
      async (payload: {
        chat: string;
        sender: string;
        message?: string;
        reaction?: boolean;
        media?: string; // URL from REST upload
        thumbnail?: string;
        media_ios?: string;
        media_normal?: string;
        thumbnail_ios?: string;
        thumbnail_normal?: string;
        contentType: 'text' | 'image' | 'video';
      }) => {
        try {
          const {
            chat,
            sender,
            message,
            media,
            thumbnail,
            media_ios,
            media_normal,
            thumbnail_ios,
            thumbnail_normal,
            contentType,
          } = payload;

          if (!chat || !sender) throw new Error('chat and sender are required');
          if (!message && !media) throw new Error('Message or media required');
          if (message && media)
            throw new Error('Send either text or media, not both');

          // Create message in DB
          const newMessage = await Message.create({
            chat,
            sender,
            message: contentType === 'text' ? message : undefined,
            reaction: payload.reaction || false,
            media: contentType !== 'text' ? media : undefined,
            thumbnail: thumbnail ? thumbnail : '',
            media_ios: media_ios ? media_ios : '',
            media_normal: media_normal ? media_normal : '',
            thumbnail_ios: thumbnail_ios ? thumbnail_ios : '',
            thumbnail_normal: thumbnail_normal ? thumbnail_normal : '',
            contentType,
          });

          const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'name image _id')
            .populate('chat', 'type name');

          const chatExist = await Chat.findById(chat);

          if (!chatExist)
            throw new AppError(StatusCodes.BAD_REQUEST, "Chat doesn't exist!");

          // need receiver id from chat sender id not in chat members array
          const receiverId = chatExist.members.find(
            memberId => memberId.toString() !== sender,
          );

          const user = await User.findById(receiverId);

          if (!user)
            throw new AppError(
              StatusCodes.BAD_REQUEST,
              'Receiver user not found',
            );

          // send sms with phone number
          const senderName =
            (populatedMessage?.chat as any)?.type === 'group'
              ? (populatedMessage?.chat as any)?.name
              : (populatedMessage?.sender as any)?.name;

          const pushMessage = `${senderName} sent you a new message`;
          await sendPushNotification(
            user?.playerId as string[],
            user?.phone,
            pushMessage,
          );

          // Join chat room and emit
          socket.join(chat);
          io.emit(`receive-message:${chat}`, populatedMessage);
          socket.emit('receive-message', populatedMessage);
        } catch (error) {
          logger.error('Error in send-message:', error);
          socket.emit(
            'error',
            new AppError(StatusCodes.BAD_REQUEST, (error as Error).message),
          );
        }
      },
    );

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(colors.red('A user disconnect'));
    });
  });
};

export default socket;

export const socketHelper = { socket };
