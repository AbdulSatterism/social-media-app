/* eslint-disable @typescript-eslint/no-explicit-any */

import { Router } from 'express';
import axios from 'axios';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import config from '../../../config';

import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';

const router = Router();

router.post(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  catchAsync(async (req, res) => {
    const prompt = req.body;

    const { data } = await axios.post(
      config.gpt.gpt_model_url as string,
      prompt,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.gpt.key}`,
        },
      },
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'AI data generated successfully',
      data: data?.choices?.[0]?.message?.content || '{}',
    });
  }),
);

export const AiRoutes = router;
