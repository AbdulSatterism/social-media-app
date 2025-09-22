import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StoryService } from './story.services';

const createStory = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await StoryService.createStory({
    author: userId,
    ...req.body,
    contentType: req.body.video ? 'video' : 'image',
  });

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Story created successfully',
    data: result,
  });
});

const allStories = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await StoryService.allStories(userId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All stories retrieved successfully',
    meta: {
      page: Number(result.meta.page),
      limit: Number(result.meta.limit),
      totalPage: result.meta.totalPage,
      total: result.meta.total,
    },
    data: result.data,
  });
});

const myAllStories = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const result = await StoryService.myAllStories(userId, req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'My stories retrieved successfully',
    meta: {
      page: Number(result.meta.page),
      limit: Number(result.meta.limit),
      totalPage: result.meta.totalPage,
      total: result.meta.total,
    },
    data: result.data,
  });
});

const getStoryById = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const storyId = req.params.id;
  const result = await StoryService.getStoryById(storyId, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Story retrieved successfully',
    data: result,
  });
});

export const StoryController = {
  createStory,
  allStories,
  getStoryById,
  myAllStories,
};
