import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { reportValidation } from './report.validation';
import { ReportController } from './report.controller';
import { cacheGet } from '../../middlewares/casheGet';

const router = express.Router();

router.post(
  '/create-report',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  validateRequest(reportValidation),
  ReportController.createReport,
);

router.get(
  '/all-report',
  auth(USER_ROLES.ADMIN),
  cacheGet('reports:all', 3600, req => ({ q: req.query })),
  ReportController.getAllReport,
);

router.get('/:id', auth(USER_ROLES.ADMIN),  cacheGet('reports:by-id', 3600, req => ({ params: req.params })), ReportController.getReportById);

router.delete('/:id', auth(USER_ROLES.ADMIN),  ReportController.deleteReport);

export const ReportRoutes = router;
