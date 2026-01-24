/* eslint-disable @typescript-eslint/no-explicit-any */
import cron from 'node-cron';
import colors from 'colors';
import { logger } from '../shared/logger';
import { Story } from '../app/modules/story/story.model';
import { User } from '../app/modules/user/user.model';
import { Message } from '../app/modules/message/message.model';
import { sendPushNotification } from './onesignal';
import chalk from 'chalk';

const HOURS_IN_MS = 60 * 60 * 1000;
const EXPIRY_THRESHOLD_HOURS = 24;
const EXPIRY_NOTIFY_AFTER_HOURS = 23;

const NOTIFICATION_CRON = '*/30 * * * *'; // Every 30 minutes
const DELETE_CRON = '*/30 * * * *'; // Every 30 minutes

const sendExpiryNotifications = async (): Promise<void> => {
  const now = Date.now();
  const notifyBefore = new Date(now - EXPIRY_NOTIFY_AFTER_HOURS * HOURS_IN_MS);

  try {
    const [expiringMessages, expiringStories] = await Promise.all([
      Message.find({
        createdAt: { $lte: notifyBefore },
        expiryNotificationSent: { $ne: true },
      }).populate({
        path: 'sender',
        select: 'phone',
      }),

      Story.find({
        createdAt: { $lte: notifyBefore },
        expiryNotificationSent: { $ne: true },
      }).populate({
        path: 'author',
        select: 'phone',
      }),
    ]);

    const phones = new Set<string>();

    expiringMessages.forEach(msg => {
      const phone = (msg.sender as any)?.phone?.trim();
      if (phone) phones.add(phone);
    });

    expiringStories.forEach(story => {
      const phone = (story.author as any)?.phone?.trim();
      if (phone) phones.add(phone);
    });

    if (!phones.size) return;

    // Fetch users + player IDs
    const users = await User.find(
      { phone: { $in: Array.from(phones) } },
      { playerId: 1 },
    );

    const playerIds = users
      .flatMap(user => user.playerId || [])
      .filter(Boolean);

    if (!playerIds.length) return;

    const notificationText =
      "Your re: disappears in 1 hour, save to your photo gallery before it's gone!";

    await sendPushNotification(playerIds, 'all', notificationText);

    logger.info(`expire notification Sent to ${playerIds.length} devices`);
  } catch (error) {
    logger.error('expire notification Failed to send notifications', error);
  }
};

export const storyDeleteJob = (): void => {
  cron.schedule(DELETE_CRON, async () => {
    const threshold = new Date(
      Date.now() - EXPIRY_THRESHOLD_HOURS * HOURS_IN_MS,
    );

    try {
      const result = await Story.deleteMany({
        createdAt: { $lt: threshold },
      });

      if (result.deletedCount) {
        logger.info(
          colors.green(
            `story Deleted ${result.deletedCount} expired stories @ ${new Date().toISOString()}`,
          ),
        );
      }
    } catch (err) {
      logger.error('story Error deleting expired stories:', err);
    }
  });
};

export const messageDeleteJob = (): void => {
  cron.schedule(DELETE_CRON, async () => {
    const threshold = new Date(
      Date.now() - EXPIRY_THRESHOLD_HOURS * HOURS_IN_MS,
    );

    try {
      const result = await Message.deleteMany({
        createdAt: { $lt: threshold },
      });
      if (result.deletedCount) {
        logger.info(
          colors.green(
            `message Deleted ${result.deletedCount} expired messages @ ${new Date().toISOString()}`,
          ),
        );
      }
    } catch (err) {
      logger.error('message Error deleting expired messages:', err);
    }
  });
};

export const initializeScheduledJobs = (): void => {
  // Schedule notification job (frequent - send notifications as soon as 23 hours passed)
  cron.schedule(NOTIFICATION_CRON, sendExpiryNotifications);

  // Schedule delete jobs (less frequent - only delete after full 24 hours)
  storyDeleteJob();
  messageDeleteJob();

  logger.info(chalk.blue(' All cron jobs initialized'));
};
