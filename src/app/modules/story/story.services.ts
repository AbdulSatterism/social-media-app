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

export const StoryService = {
  createStory,
};
