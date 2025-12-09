import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ComplainService } from './complain.services';

const createComplain = catchAsync(async (req, res) => {
  const result = await ComplainService.createComplain(
    req.user.id,
    req.params.id,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Complain created successfully',
    data: result,
  });
});

export const ComplainController = {
  createComplain,
};
