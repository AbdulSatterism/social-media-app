/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';

import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import validateRequest from '../../middlewares/validateRequest';
import fileUploader from '../../middlewares/fileUploader';
import { cacheGet } from '../../middlewares/casheGet';
const router = express.Router();

router.post(
  '/create-user',
  validateRequest(UserValidation.createUserSchema),
  UserController.createUser,
);

router.get(
  '/all-user',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  cacheGet('users:all', 3600, req => ({ q: req.query })),
  UserController.getAllUser,
);

router.get(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  cacheGet('users:no-pagination', 3600, req => ({ q: req.query })),
  UserController.usersWithoutPagination,
);

router.patch(
  '/update-profile',
  fileUploader({ image: { fileType: 'images', size: 5 * 1024 * 1024 } }),
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  validateRequest(UserValidation.updateUserProfileSchema),
  UserController.updateProfile,
);

router.get(
  '/user',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  cacheGet('users:user', 3600, req => ({ q: req.query })),
  UserController.getUserProfile,
);

router.get(
  '/get-single-user/:id',
  auth(USER_ROLES.ADMIN),
  cacheGet('users:single', 3600, req => ({ params: req.params })),
  UserController.getSingleUser,
);

// get user by search by phone
router.get(
  '/user-search',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  cacheGet('users:search', 3600, req => ({ q: req.query })),
  UserController.searchUser,
);

router.get(
  '/profile',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  cacheGet('users:profile', 3600, req => ({ q: req.query })),
  UserController.getUserProfile,
);

router.delete(
  '/delete-profile',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  UserController.deleteUser,
);

router.delete(
  '/delete-by-admin/:userId',
  auth(USER_ROLES.ADMIN),
  UserController.deleteUserByAdmin,
);

router.post(
  '/contact',
  cacheGet('users:contact', 3600, req => ({ q: req.query })),
  UserController.contactMatch,
);

router.post(
  '/player-id/:id',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  UserController.playerId,
);

router.post(
  '/block/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  UserController.blockUser,
);

export const UserRoutes = router;
