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
import { emailTemplate } from '../../../shared/emailTemplate';
import { emailHelper } from '../../../helpers/emailHelper';
import { AdminNotification } from '../notifications/notifications.model';
import { sendSMS } from '../../../util/verifyByTwilio';

const createUserFromDb = async (payload: IUser) => {
  payload.role = USER_ROLES.USER;
  const result = await User.create(payload);

  if (!result) {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Failed to create user');
  }

  const otp = generateOTP();
  const emailValues = {
    name: result.name || 'User',
    otp,
    email: result.email,
  };

  // send sms with phone number
  const message = `Welcome to re social media! Your one time code for verification is ${otp}. Use it to verify your account.`;
  await sendSMS(result.phone, message);

  // send email
  const accountEmailTemplate = emailTemplate.createAccount(emailValues);
  emailHelper.sendEmail(accountEmailTemplate);

  // create notificaiton for admin

  await AdminNotification.create({
    content: `New user ${result.name} registered`,
  });

  // Update user with authentication details
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 20 * 60000),
  };
  const updatedUser = await User.findOneAndUpdate(
    { _id: result._id },
    { $set: { authentication } },
  );
  if (!updatedUser) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found for update');
  }

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

const deleteUser = async (id: string) => {
  const isExistUser = await User.findById(id);
  if (!isExistUser) {
    throw new AppError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }
  const result = await User.findByIdAndDelete(id);
  return result;
};

// delete user by admin

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

export const UserService = {
  createUserFromDb,
  getUserProfileFromDB,
  updateProfileToDB,
  getSingleUser,
  searchUser,
  getAllUsers,
  deleteUser,
  deleteUserByAdmin,
};
