import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { NotificationService } from './notifications.service';

const getMyAllNotifications = catchAsync(async (req, res) => {
  const userId = req?.user?.id;
  const result = await NotificationService.getMyAllNotifications(
    userId,
    req.query,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Notifications retrieved successfully',
    meta: {
      page: result.meta.page,
      limit: result.meta.limit,
      totalPage: result.meta.totalPage,
      total: result.meta.total,
    },
    data: result.data,
  });
});

const deleteNotification = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req?.user?.id;
  const result = await NotificationService.deleteNotification(id, userId);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Notification deleted successfully',
    data: result,
  });
});

export const NotificationController = {
  getMyAllNotifications,
  deleteNotification,
};
