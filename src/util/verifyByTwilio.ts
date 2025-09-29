/* eslint-disable @typescript-eslint/no-explicit-any */
import config from '../config';
import { Twilio } from 'twilio';
import { logger } from '../shared/logger';
import colors from 'colors';
import AppError from '../app/errors/AppError';
import { StatusCodes } from 'http-status-codes';

const twilioClient = new Twilio(
  config.twilio.twilio_account_sid,
  config.twilio.twilio_auth_token,
);

export const sendSMS = async (to: string, message: string): Promise<void> => {
  try {
    await twilioClient.messages.create({
      body: message,
      from: config.twilio.twilio_phone_number,
      to,
    });
    logger.info(colors.green(`✅message send to ${to} phone number`));
  } catch (error: any) {
    console.log('error in twilio', error);
    logger.error('❌ Failed to send SMS:', error.message || error);
    throw new AppError(StatusCodes.FORBIDDEN, 'Failed to send SMS');
  }
};
