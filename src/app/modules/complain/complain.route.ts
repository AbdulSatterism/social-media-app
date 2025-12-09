import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';
import { ComplainController } from './complain.controller';
const router = express.Router();

router.post(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  ComplainController.createComplain,
);

export const ComplainRoutes = router;
