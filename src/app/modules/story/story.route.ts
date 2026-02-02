import { Router } from 'express';

// import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
// import { StoryValidation } from './story.validation';
import { StoryController } from './story.controller';
import fileUploader from '../../middlewares/fileUploader';
import validateRequest from '../../middlewares/validateRequest';
import { StoryValidation } from './story.validation';
import { cacheGet } from '../../middlewares/casheGet';

const router = Router();

router.post(
  '/create-story',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  fileUploader({
    image: {
      fileType: 'images',
      size: 50 * 1024 * 1024, // 50MB
      returnType: 'url',
      delivery: 'original',
    },
    video: {
      fileType: 'videos',
      size: 1000 * 1024 * 1024, // 1000MB
      returnType: 'url',
      delivery: 'playback',
    },
  }),
  validateRequest(StoryValidation.createStoryValidationSchema),
  StoryController.createStory,
);

router.get(
  '/all-stories',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  cacheGet('stories:all', 120, req => ({ q: req.query })),
  StoryController.allStories,
);

router.get(
  '/my-stories',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  cacheGet('stories:my-stories', 120, req => ({ q: req.query })),
  StoryController.myAllStories,
);

router.get(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  cacheGet('stories:by-id', 120, req => ({ params: req.params })),
  StoryController.getStoryById,
);

router.delete(
  '/delete/:id',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  StoryController.deleteStory,
);

export const StoryRoutes = router;
