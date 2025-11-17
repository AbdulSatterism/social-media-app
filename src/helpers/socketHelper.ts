/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import colors from 'colors';
import { Server } from 'socket.io';
import { logger } from '../shared/logger';
import { Message } from '../app/modules/message/message.model';
import AppError from '../app/errors/AppError';
import { StatusCodes } from 'http-status-codes';

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
        media?: string; // URL from REST upload
        thumbnail?: string;
        contentType: 'text' | 'image' | 'video';
      }) => {
        try {
          const { chat, sender, message, media, thumbnail, contentType } =
            payload;

          if (!chat || !sender) throw new Error('chat and sender are required');
          if (!message && !media) throw new Error('Message or media required');
          if (message && media)
            throw new Error('Send either text or media, not both');

          // Create message in DB
          const newMessage = await Message.create({
            chat,
            sender,
            message: contentType === 'text' ? message : undefined,
            media: contentType !== 'text' ? media : undefined,
            thumbnail: thumbnail ? thumbnail : '',
            contentType,
          });

          const populatedMessage = await Message.findById(
            newMessage._id,
          ).populate('sender', 'name image _id');

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
