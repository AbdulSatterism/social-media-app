/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import colors from 'colors';
import { Server } from 'socket.io';
import { logger } from '../shared/logger';
import { Message } from '../app/modules/message/message.model';
import { saveSocketMedia } from '../app/middlewares/socketMediaUpload';
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
        data?: string;
        fileType?: 'image' | 'video';
      }) => {
        try {
          const { chat, sender, message, data, fileType } = payload;

          if (!chat || !sender)
            throw new AppError(
              StatusCodes.NOT_FOUND,
              'Chat and sender are required',
            );
          if (message && data)
            throw new AppError(
              StatusCodes.BAD_REQUEST,
              'Send either text or media, not both',
            );
          if (!message && !data)
            throw new AppError(
              StatusCodes.BAD_REQUEST,
              'Message or media required',
            );

          // Determine content type
          const contentType: 'text' | 'image' | 'video' = message
            ? 'text'
            : fileType === 'image'
              ? 'image'
              : 'video';

          // Save media if exists
          const mediaUrl = data
            ? await saveSocketMedia(
                data,
                contentType === 'image' ? 'images' : 'videos',
              )
            : undefined;

          // Save message
          const newMessage = await Message.create({
            chat,
            sender,
            message: message || undefined,
            media: mediaUrl,
            contentType,
          });

          // Populate sender info
          const populatedMessage = await Message.findById(
            newMessage._id,
          ).populate('sender', 'name image');

          // Join room and emit
          socket.join(chat);
          socket.to(chat).emit('receive-message', populatedMessage);
          socket.emit('receive-message', populatedMessage);
        } catch (err: any) {
          socket.emit('error', { message: err.message });
        }
      },
    );

    /*

    socket.on('send-message', async ({ chat, sender, message, media }) => {
      try {
        // Save the message to the database
        const newMessage = await Message.create({
          chat,
          sender,
          message,
          media,
        });

        // Populate the senderId field
        const populatedMessage = await newMessage.populate(
          'sender',
          'name image',
        );

        // Emit the message to all users in the specified chat room
        io.emit(`receive-message:${populatedMessage.chat}`, populatedMessage);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });


    */

    // Listen for the chat-started event and emit to the specific room
    socket.on('chat-started', ({ chatRoom }) => {
      io.to(chatRoom).emit(`chat-started:${chatRoom}`, {
        chatRoom,
        message: 'Chat started between the groups.',
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(colors.red('A user disconnect'));
    });
  });
};

export default socket;

export const socketHelper = { socket };
