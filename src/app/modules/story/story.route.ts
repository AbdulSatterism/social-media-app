import { Router } from 'express';

// import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
// import { StoryValidation } from './story.validation';
import { StoryController } from './story.controller';
import fileUploader from '../../middlewares/fileUploader';
import validateRequest from '../../middlewares/validateRequest';
import { StoryValidation } from './story.validation';

const router = Router();

router.post(
  '/create-story',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  fileUploader({
    image: {
      fileType: 'images',
      size: 5 * 1024 * 1024, // 5MB
    },
    video: {
      fileType: 'videos',
      size: 50 * 1024 * 1024, // 50MB
    },
  }),
  validateRequest(StoryValidation.createStoryValidationSchema),
  StoryController.createStory,
);

router.get(
  '/all-stories',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  StoryController.allStories,
);

router.get(
  '/my-stories',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  StoryController.myAllStories,
);

router.get(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  StoryController.getStoryById,
);

export const StoryRoutes = router;
