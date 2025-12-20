/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
import { StatusCodes } from 'http-status-codes';
import { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES } from '../../../enums/user';
import generateOTP from '../../../util/generateOTP';

import { IUser } from './user.interface';
import { User } from './user.model';
import unlinkFile from '../../../shared/unlinkFile';
import AppError from '../../errors/AppError';
import { Types } from 'mongoose';
import { AdminNotification } from '../notifications/notifications.model';
import { sendSMS } from '../../../util/verifyByTwilio';

const createUserFromDb = async (payload: IUser) => {
  payload.role = USER_ROLES.USER;

  if (!payload.phone) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Please provide phone number');
  }

  const existingUser = await User.findOne({ phone: payload.phone });

  if (existingUser) {
    if (!existingUser.verified || !existingUser.image || !existingUser.name) {
      await User.deleteOne({ phone: payload.phone });
    }
  }

  const result = await User.create(payload);

  if (!result) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to create user');
  }

  const otp = generateOTP();

  // send sms with phone number
  // const message = `Welcome to re: Your one-time code for verification is ${otp}.`;

  const message = `Welcome to re: 
  Your one-time verification code is: ${otp}`;

  await sendSMS(payload?.phone, message);

  // create notificaiton for admin

  await AdminNotification.create({
    content: `New user ${result.name} registered`,
  });

  // Update user with authentication details
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 20 * 60000),
  };

  await User.findOneAndUpdate(
    { _id: result._id },
    { $set: { authentication } },
  );

  return result;
};

const getAllUsers = async (query: Record<string, unknown>) => {
  const { page, limit } = query;
  const pages = parseInt(page as string) || 1;
  const size = parseInt(limit as string) || 10;
  const skip = (pages - 1) * size;

  const [result, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(size).lean(),
    User.countDocuments(),
  ]);

  const totalPage = Math.ceil(total / size);

  return {
    data: result,
    meta: {
      page: pages,
      limit: size,
      totalPage,
      total,
    },
  };
};

const usersWithoutPagination = async (search: string) => {
  // if search term is provided search by name  or email or phone

  let result;

  if (search) {
    result = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();
  } else {
    result = await User.find().sort({ createdAt: -1 }).lean();
  }

  return result;
};

const getUserProfileFromDB = async (
  user: JwtPayload,
): Promise<Partial<IUser>> => {
  const { id } = user;
  const isExistUser = await User.findById(id);
  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  return isExistUser;
};

const updateProfileToDB = async (
  user: JwtPayload,
  payload: Partial<IUser>,
): Promise<Partial<IUser | null>> => {
  const { id } = user;
  const isExistUser = await User.isExistUserById(id);

  if (!isExistUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User doesn't exist!");
  }

  if (!isExistUser) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Blog not found');
  }

  if (!isExistUser.verified) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Please verify your account first',
    );
  }

  if (payload.image && isExistUser.image) {
    unlinkFile(isExistUser.image);
  }

  const updateDoc = await User.findOneAndUpdate({ _id: id }, payload, {
    new: true,
  });

  return updateDoc;
};

const getSingleUser = async (id: string): Promise<IUser | null> => {
  const result = await User.findById(id);
  return result;
};

// Search user by phone number, name, or email
const searchUser = async (searchTerm: string, userId: string) => {
  let result;

  const id = new Types.ObjectId(userId);

  // Only search if the search term is provided
  if (searchTerm) {
    result = await User.find({
      $and: [
        { _id: { $ne: id } }, // Ensure the userId is not part of the result
        {
          $or: [
            { phone: { $regex: searchTerm, $options: 'i' } },
            { name: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
          ],
        },
      ],
    });
  } else {
    // If no search term is provided, return a limited set of results
    result = await User.find({ _id: { $ne: userId } }).limit(10);
  }

  return result;
};

const deleteUserByAdmin = async (adminId: string, userId: string) => {
  const [isExistAdmin, isExistUser] = await Promise.all([
    User.findById(adminId),
    User.findById(userId),
  ]);

  if (!isExistAdmin) {
    throw new AppError(StatusCodes.NOT_FOUND, "Admin user doesn't exist!");
  }

  if (!isExistUser) {
    throw new AppError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  if (isExistAdmin.role !== 'ADMIN') {
    throw new AppError(StatusCodes.BAD_REQUEST, 'You are not admin');
  }

  const result = await User.findByIdAndDelete(userId);
  return result;
};

const contactMatch = async (payload: any) => {
  const allUser = await User.find(
    {},
    { _id: 1, image: 1, name: 1, phone: 1 },
  ).lean();
  const match = payload
    .map((item: any) => allUser.find(user => user.phone === item.phone))
    .filter((user: any) => user !== undefined)
    .map((user: any) => ({
      _id: user._id,
      image: user.image,
      name: user.name,
      phone: user.phone,
    }));
  const unmatch = payload.filter(
    (item: any) => !match.some((user: any) => user.phone === item.phone),
  );
  return { match, unmatch };
};

const getPlayerId = async (playerId: string, userId: string) => {
  const isExistUser = await User.findById(userId);
  if (!isExistUser) {
    throw new AppError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  // player id is

  const updateUser = await User.findByIdAndUpdate(
    { _id: userId },
    { $addToSet: { playerId: playerId } },
    { new: true },
  );

  return updateUser;
};

const deleteUser = async (id: string) => {
  const isExistUser = await User.findById(id);
  if (!isExistUser) {
    throw new AppError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  const result = await User.findByIdAndDelete(id);
  return result;
};

const blockUser = async (id: string) => {
  const isExistUser = await User.findById(id);
  if (!isExistUser) {
    throw new AppError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  const result = await User.findByIdAndUpdate(
    id,
    { isBlocked: true },
    { new: true },
  );

  return result;
};

export const UserService = {
  createUserFromDb,
  getUserProfileFromDB,
  updateProfileToDB,
  getSingleUser,
  searchUser,
  getAllUsers,
  deleteUser,
  deleteUserByAdmin,
  contactMatch,
  getPlayerId,
  blockUser,
  usersWithoutPagination,
};
