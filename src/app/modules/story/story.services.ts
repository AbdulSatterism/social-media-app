import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import { User } from '../user/user.model';
import { IStory } from './story.interface';
import { Story } from './story.model';
import { sendPushNotification } from '../../../util/onesignal';

const createStory = async (payload: IStory) => {
  const isUserExist = await User.isExistUserById(payload?.author.toString());

  if (!isUserExist) {
    throw new AppError(StatusCodes.NOT_FOUND, "User doesn't exist!");
  }

  const result = await Story.create(payload);

  // send push notification all mutualFriendsPlayerId hast array of string all player id of mutual friends

  const notificationText = `${isUserExist.name} added to their Story. Check it out & share a re:`;

  await sendPushNotification(
    isUserExist.mutualFriendsPlayerId,
    'all',
    notificationText,
  );

  return result;
};

const allStories = async (userId: string, query: Record<string, unknown>) => {
  const { page, limit } = query;
  const pages = parseInt(page as string) || 1;
  const size = parseInt(limit as string) || 10;
  const skip = (pages - 1) * size;
  const isUserExist = await User.isExistUserById(userId);

  // Use isUserExist.contactList directly
  if (!isUserExist.contactList?.length) {
    return {
      data: [],
      meta: { page, limit, totalPage: 0, total: 0 },
    };
  }

  // Find all users whose phone exists in contactList
  const contactUsers = await User.find(
    { phone: { $in: isUserExist.contactList } },
    { _id: 1 },
  ).lean();

  const contactUserIds = contactUsers.map(user => user._id);

  const filter = { author: { $in: contactUserIds } };

  const [result, total] = await Promise.all([
    Story.find(filter)
      .populate('author', { name: 1, image: 1 })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size)
      .lean(),
    Story.countDocuments(filter),
  ]);

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
      .populate('author', { name: 1 })
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

  const result = await Story.findById(id).populate('author', { name: 1 });

  if (!result) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Story not found!');
  }

  return result;
};

// delete story author

const deleteStory = async (userId: string, storyId: string) => {
  const [user, story] = await Promise.all([
    User.findById(userId),
    Story.findById(storyId),
  ]);

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, 'User not found!');
  }

  if (!story) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Story not found!');
  }

  if (story.author.toString() !== userId) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      'You are not allowed to delete this story',
    );
  }

  const result = await Story.findByIdAndDelete(storyId);
  return result;
};

export const StoryService = {
  createStory,
  getStoryById,
  allStories,
  myAllStories,
  deleteStory,
};
