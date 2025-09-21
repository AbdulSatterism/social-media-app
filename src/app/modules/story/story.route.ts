import { NextFunction, Request, Response, Router } from 'express';
import fileUploadHandler from '../../middlewares/fileUploadHandler';

import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { StoryValidation } from './story.validation';
import { StoryController } from './story.controller';

const router = Router();

router.post(
  '/create-story',
  fileUploadHandler(),
  //   auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  (req: Request, res: Response, next: NextFunction) => {
    req.body = JSON.parse(req.body.data);
    next();
  },
  //   validateRequest(StoryValidation.createStoryValidationSchema),
  StoryController.createStory,
);
