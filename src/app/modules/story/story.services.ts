import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import { User } from '../user/user.model';
import { IStory } from './story.interface';
import { Story } from './story.model';

const createStory = async (payload: IStory) => {
  const isUserExist = await User.isExistUserById(payload?.author.toString());

  if (!isUserExist) {
    throw new AppError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  const result = await Story.create(payload);
  return result;
};

const allStories = async (userId: string, query: Record<string, unknown>) => {
  const { page, limit } = query;
  const pages = parseInt(page as string) || 1;
  const size = parseInt(limit as string) || 10;
  const skip = (pages - 1) * size;
  const isUserExist = await User.isExistUserById(userId);

  if (!isUserExist) {
    throw new AppError(StatusCodes.NOT_FOUND, 'needs to be logged in!');
  }

  const [result, total] = await Promise.all([
    Story.find().sort({ createdAt: -1 }).skip(skip).limit(size).lean(),
    Story.countDocuments(),
  ]);

  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Story not found!');
  }

  const totalPage = Math.ceil(total / size);

  return {
    data: result,
    meta: {
      page,
      limit,
      totalPage,
      total,
    },
  };
};

//my all story

const myAllStories = async (userId: string, query: Record<string, unknown>) => {
  const { page, limit } = query;
  const pages = parseInt(page as string) || 1;
  const size = parseInt(limit as string) || 10;
  const skip = (pages - 1) * size;

  const isUserExist = await User.isExistUserById(userId);
  if (!isUserExist) {
    throw new AppError(StatusCodes.NOT_FOUND, 'needs to be logged in!');
  }

  const [result, total] = await Promise.all([
    Story.find({ author: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size)
      .lean(),
    Story.countDocuments({ author: userId }),
  ]);

  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Story not found!');
  }
  const totalPage = Math.ceil(total / size);
  return {
    data: result,
    meta: {
      page,
      limit,
      totalPage,
      total,
    },
  };
};

// story get by id
const getStoryById = async (id: string, userId: string) => {
  const isUserExist = await User.isExistUserById(userId);

  if (!isUserExist) {
    throw new AppError(StatusCodes.NOT_FOUND, 'needs to be logged in!');
  }

  const result = await Story.findById(id);

  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Story not found!');
  }

  return result;
};

export const StoryService = {
  createStory,
  getStoryById,
  allStories,
  myAllStories,
};
