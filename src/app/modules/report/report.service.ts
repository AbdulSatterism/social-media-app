import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import { IReport } from './report.interface';
import { Report } from './report.model';

const createReport = async (payload: IReport) => {
  const result = await Report.create(payload);
  return result;
};

// get all report service
const getAllReport = async (query: Record<string, unknown>) => {
  const { page, limit } = query;
  const pages = parseInt(page as string) || 1;
  const size = parseInt(limit as string) || 10;
  const skip = (pages - 1) * size;

  const [result, total] = await Promise.all([
    Report.find({}).sort({ createdAt: -1 }).skip(skip).limit(size).exec(),
    Report.countDocuments(),
  ]);

  const totalPage = Math.ceil(total / size);

  return {
    data: result,
    meta: {
      page: pages,
      limit: size,
      totalPage,
      total,
    },
  };
};

// Get a single report by ID
const getReportById = async (reportId: string) => {
  const report = await Report.findById(reportId).exec();
  if (!report) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Report not found');
  }
  return report;
};

// delete report by id

const deleteReport = async (id: string) => {
  const result = await Report.findByIdAndDelete(id);
  return result;
};

export const ReportService = {
  createReport,
  getAllReport,
  getReportById,
  deleteReport,
};
