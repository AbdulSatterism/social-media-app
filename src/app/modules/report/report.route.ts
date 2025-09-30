import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import validateRequest from '../../middlewares/validateRequest';
import { reportValidation } from './report.validation';
import { ReportController } from './report.controller';

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
  ReportController.getAllReport,
);

router.get('/:id', auth(USER_ROLES.ADMIN), ReportController.getReportById);

router.delete('/:id', auth(USER_ROLES.ADMIN), ReportController.deleteReport);

export const ReportRoutes = router;
