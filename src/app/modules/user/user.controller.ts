import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { UserService } from './user.service';

const createUser = catchAsync(async (req, res) => {
  const value = {
    ...req.body,
  };

  await UserService.createUserFromDb(value);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Please check your inbox to verify your account.',
  });
});

const getAllUser = catchAsync(async (req, res) => {
  const result = await UserService.getAllUsers(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'all user retrieved successfully',
    meta: {
      page: Number(result.meta.page),
      limit: Number(result.meta.limit),
      totalPage: result.meta.totalPage,
      total: result.meta.total,
    },
    data: result.data,
  });
});

const getUserProfile = catchAsync(async (req, res) => {
  const user = req.user;
  const result = await UserService.getUserProfileFromDB(user);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Profile data retrieved successfully',
    data: result,
  });
});

//update profile
const updateProfile = catchAsync(async (req, res) => {
  const user = req.user;

  const result = await UserService.updateProfileToDB(user, req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Profile updated successfully',
    data: result,
  });
});

const getSingleUser = catchAsync(async (req, res) => {
  const result = await UserService.getSingleUser(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User retrived successfully',
    data: result,
  });
});

// search by phone number
const searchUser = catchAsync(async (req, res) => {
  const searchTerm = req.query.searchTerm;
  const userId = req?.user?.id;

  const result = await UserService.searchUser(searchTerm as string, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'get user by searching phone number',
    data: result,
  });
});

const deleteUser = catchAsync(async (req, res) => {
  const result = await UserService.deleteUser(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User deleted successfully',
    data: result,
  });
});

const deleteUserByAdmin = catchAsync(async (req, res) => {
  const { userId } = req.params;
  await UserService.deleteUserByAdmin(req.user.id, userId);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User deleted successfully by admin',
    data: null,
  });
});

const contactMatch = catchAsync(async (req, res) => {
  const result = await UserService.contactMatch(req.body);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Contact Match',
    data: result,
  });
});

const playerId = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const playerId = req.params.id;
  await UserService.getPlayerId(playerId, userId);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'player id added',
    data: null,
  });
});

const blockUser = catchAsync(async (req, res) => {
  const userId = req.params.id;
  const result = await UserService.blockUser(userId);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'User blocked successfully',
    data: result,
  });
});

export const UserController = {
  createUser,
  getUserProfile,
  updateProfile,
  searchUser,
  getSingleUser,
  getAllUser,
  deleteUser,
  deleteUserByAdmin,
  contactMatch,
  playerId,
  blockUser,
};
