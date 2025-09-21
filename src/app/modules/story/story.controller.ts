import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StoryService } from './story.services';

const createStory = catchAsync(async (req, res) => {
  const userId = req.user.id;

  let content = '';
  if (req.files && 'content' in req.files && req.files.content[0]) {
    content = `/images/${req.files.content[0].filename}`;
  }

  const value = {
    content: content,
    author: userId,
  };

  const result = await StoryService.createStory(value);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Story created successfully',
    data: result,
  });
});

export const StoryController = {
  createStory,
};
