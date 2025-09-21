import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import { User } from '../user/user.model';
import { IStory } from './story.interface';

const createStory = async (payload: IStory) => {
  const isUserExist = await User.isExistUserById(payload?.author.toString());

  if (!isUserExist) {
    throw new AppError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  console.log({ isUserExist, payload });

  //   const result = await User.create(payload);
  return null;
};

export const StoryService = {
  createStory,
};
