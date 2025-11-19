/* eslint-disable @typescript-eslint/no-explicit-any */
import * as OneSignal from 'onesignal-node';

import config from '../config';
import { logger } from '../shared/logger';
import colors from 'colors';
import AppError from '../app/errors/AppError';
import { StatusCodes } from 'http-status-codes';

const client = new OneSignal.Client(
  config.onesignal.onesignal_app_id as string,
  config.onesignal.onesignal_api_key as string,
);

export const sendPushNotification = async (
  playerId: string[],
  to: string,
  message: string,
) => {
  try {
    const notification = {
      contents: { en: message },
      include_player_ids: playerId,
    };

    await client.createNotification(notification);

    logger.info(colors.green(`✅notification send to ${to} phone number`));
  } catch (error: any) {
    logger.error(
      '❌ Failed to send push notification:',
      error.message || error,
    );
    throw new AppError(
      StatusCodes.FORBIDDEN,
      'Failed to send push notification',
    );
  }
};
