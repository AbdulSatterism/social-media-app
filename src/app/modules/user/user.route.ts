/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { USER_ROLES } from '../../../enums/user';
import auth from '../../middlewares/auth';

import { UserController } from './user.controller';
import { UserValidation } from './user.validation';
import validateRequest from '../../middlewares/validateRequest';
import fileUploader from '../../middlewares/fileUploader';
const router = express.Router();

router.post(
  '/create-user',
  validateRequest(UserValidation.createUserSchema),
  UserController.createUser,
);

router.get(
  '/all-user',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  UserController.getAllUser,
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
  UserController.getUserProfile,
);

// router.get('/get-all-users', auth(USER_ROLES.ADMIN), UserController.getAllUser);

router.get(
  '/get-single-user/:id',
  auth(USER_ROLES.ADMIN),
  UserController.getSingleUser,
);

// get user by search by phone
router.get(
  '/user-search',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  UserController.searchUser,
);

router.get(
  '/profile',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
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
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  UserController.contactMatch,
);

export const UserRoutes = router;
