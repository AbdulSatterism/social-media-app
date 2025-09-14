/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import { User } from '../user/user.model';
import { Notification } from './notifications.model';
import mongoose from 'mongoose';
import AppError from '../../errors/AppError';

const getAllNotification = async () => {
  const result = await Notification.find();

  const count = await Notification.countDocuments();

  const data = {
    result,
    count,
  };

  return data;
};

const getReceiverGroupNotification = async (groupId: string) => {
  const result = await Notification.find({ receiverGroupId: groupId });

  const count = await Notification.countDocuments();

  const data = {
    result,
    count,
  };

  return data;
};

const getUserNotification = async (userId: string) => {
  const existUser = await User.findById(userId);

  if (!existUser) {
    throw new AppError(StatusCodes.NOT_FOUND, 'this user not found');
  }
  const userIdObjectId = new mongoose.Types.ObjectId(userId);
  // Aggregation pipeline
  const notifications = await Notification.aggregate([
    // Step 1: Lookup to join the Group collection
    {
      $lookup: {
        from: 'groups', // Name of the Group collection
        localField: 'receiverGroupId', // Field in Notification
        foreignField: '_id', // Field in Group
        as: 'receiverGroup', // Name for the joined data
      },
    },
    // Step 2: Unwind the receiverGroup array
    {
      $unwind: '$receiverGroup',
    },
    // Step 3: Match notifications where the user exists in receiverGroup.invite[]
    {
      $match: {
        'receiverGroup.invite': userIdObjectId, // Check if userId exists in the invite array
      },
    },
    // Step 4: Lookup to populate user details
    {
      $lookup: {
        from: 'users', // Name of the User collection
        localField: 'userId', // Field in Notification
        foreignField: '_id', // Field in User
        as: 'user', // Name for the joined data
      },
    },
    // Step 5: Unwind the user array
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true, // Handle cases where userId might not exist
      },
    },
    // Step 6: Project fields for notification
    {
      $project: {
        _id: 1,
        senderGroupId: 1,
        receiverGroupId: 1,
        invitationId: 1,
        'receiverGroup.name': 1, // Include the group name
        'user._id': 1,
        'user.name': 1,
        'user.email': 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  return notifications;
};

export const NotificationService = {
  getAllNotification,
  getUserNotification,
  getReceiverGroupNotification,
};
