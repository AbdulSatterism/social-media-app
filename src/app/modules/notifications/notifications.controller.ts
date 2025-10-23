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

///

const getAdminNotificaiton = catchAsync(async (req, res) => {
  const result = await NotificationService.getAllAdminNotification(req.query);
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

const getSingleNotification = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await NotificationService.getSingleNotification(id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Notification retrieved successfully',
    data: result,
  });
});

const deleteNotificationByAdmin = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await NotificationService.deleteNotificationByAdmin(id);
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Notification deleted successfully',
    data: result,
  });
});

const sendInboxMessageByAdmin = catchAsync(async (req, res) => {
  const result = await NotificationService.sendInboxMessageByAdmin(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Message sent successfully',
    data: result,
  });
});

export const NotificationController = {
  getMyAllNotifications,
  deleteNotification,
  getAdminNotificaiton,
  getSingleNotification,
  sendInboxMessageByAdmin,
  deleteNotificationByAdmin,
};
