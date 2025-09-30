import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ReportService } from './report.service';

const createReport = catchAsync(async (req, res) => {
  const result = await ReportService.createReport(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: 'Report created successfully',
    data: result,
  });
});

// all report

const getAllReport = catchAsync(async (req, res) => {
  const result = await ReportService.getAllReport(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'All reports retrieved successfully',
    meta: {
      page: Number(result.meta.page),
      limit: Number(result.meta.limit),
      totalPage: result.meta.totalPage,
      total: result.meta.total,
    },
    data: result.data,
  });
});

const getReportById = catchAsync(async (req, res) => {
  const result = await ReportService.getReportById(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Report retrieved successfully',
    data: result,
  });
});

const deleteReport = catchAsync(async (req, res) => {
  const result = await ReportService.deleteReport(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Report deleted successfully',
    data: result,
  });
});

export const ReportController = {
  createReport,
  getAllReport,
  getReportById,
  deleteReport,
};
