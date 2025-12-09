/* eslint-disable @typescript-eslint/no-explicit-any */
import cron from 'node-cron';
import colors from 'colors';
import { logger } from '../shared/logger';
import { Story } from '../app/modules/story/story.model';
import { User } from '../app/modules/user/user.model';
import { Message } from '../app/modules/message/message.model';
import { sendPushNotification } from './onesignal';

const HOURS_IN_MS = 60 * 60 * 1000;
const EXPIRY_THRESHOLD_HOURS = 24;
const NOTIFICATION_WINDOW_START = 2;
const NOTIFICATION_WINDOW_END = 3;
const HOURLY_CRON = '0 * * * *';

/**
 * Sends push notifications to users whose content will expire in 2-3 hours
 */
const sendExpiryNotifications = async (): Promise<void> => {
  const now = Date.now();
  const twoHoursFromNow = new Date(
    now + NOTIFICATION_WINDOW_START * HOURS_IN_MS,
  );
  const threeHoursFromNow = new Date(
    now + NOTIFICATION_WINDOW_END * HOURS_IN_MS,
  );

  try {
    const timeWindow = {
      $lte: threeHoursFromNow,
      $gt: twoHoursFromNow,
    };

    // Find content that will expire soon
    const [expiringStories, expiringMessages] = await Promise.all([
      Story.find({ createdAt: timeWindow }).populate('author'),
      Message.find({ createdAt: timeWindow }).populate('sender'),
    ]);

    // Collect unique phone numbers from expiring content
    const userPhones = new Set<string>();

    expiringMessages.forEach(message => {
      const phone = (message.sender as any)?.phone?.trim();
      if (phone) userPhones.add(phone);
    });

    expiringStories.forEach(story => {
      const phone = (story.author as any)?.phone?.trim();
      if (phone) userPhones.add(phone);
    });

    if (userPhones.size === 0) return;

    // Get all player IDs for affected users
    const users = await User.find({ phone: { $in: Array.from(userPhones) } });
    const playerIds = users
      .flatMap(user => user.playerId || [])
      .filter((id): id is string => !!id);

    // Send bulk notification
    if (playerIds.length > 0) {
      const notificationText = `Your re: disappears in 2 hours, save to your photo gallery before it's gone!`;
      await sendPushNotification(playerIds, 'all', notificationText);
      logger.info(
        `[expiryNotification] Sent notification to ${playerIds.length} devices`,
      );
    }
  } catch (err) {
    logger.error('[expiryNotification] Error sending notifications:', err);
  }
};

/**
 * Deletes stories older than 24 hours
 */
export const storyDeleteJob = (): void => {
  cron.schedule(HOURLY_CRON, async () => {
    const threshold = new Date(
      Date.now() - EXPIRY_THRESHOLD_HOURS * HOURS_IN_MS,
    );

    try {
      const result = await Story.deleteMany({ createdAt: { $lt: threshold } });

      if (result.deletedCount) {
        logger.info(
          colors.green(
            `[storyExpiry] Deleted ${result.deletedCount} expired stories @ ${new Date().toISOString()}`,
          ),
        );
      }
    } catch (err) {
      logger.error('[storyExpiry] Error deleting expired stories:', err);
    }
  });
};

/**
 * Deletes messages older than 24 hours
 */
export const messageDeleteJob = (): void => {
  cron.schedule(HOURLY_CRON, async () => {
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
            `[messageExpiry] Deleted ${result.deletedCount} expired messages @ ${new Date().toISOString()}`,
          ),
        );
      }
    } catch (err) {
      logger.error('[messageExpiry] Error deleting expired messages:', err);
    }
  });
};

/**
 * Initializes all scheduled jobs
 * Call this once when your server starts
 */
export const initializeScheduledJobs = (): void => {
  storyDeleteJob();
  messageDeleteJob();

  // Schedule notification job
  cron.schedule(HOURLY_CRON, sendExpiryNotifications);

  logger.info('[scheduledJobs] All cron jobs initialized');
};
