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

export const StoryController = {
  createStory,
};
