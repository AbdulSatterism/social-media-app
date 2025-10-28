import cron from 'node-cron';
import { logger } from '../shared/logger';
import colors from 'colors';
import { Story } from '../app/modules/story/story.model';
import { Message } from '../app/modules/message/message.model';
import { sendSMS } from './verifyByTwilio';

// Send SMS notifications before deleting stories and messages
const sendExpiryNotifications = async () => {
  const now = Date.now();
  const oneHourFromNow = new Date(now + 2 * 60 * 60 * 1000);
  const twoHoursFromNow = new Date(now + 3 * 60 * 60 * 1000);

  try {
    // Find stories that will expire in 2-3 hours
    // const expiringStories = await Story.find({
    //   createdAt: {
    //     $gte: oneHourFromNow,
    //     $lt: twoHoursFromNow,
    //   },
    // }).populate('author');

    // console.log('Expiring Stories:', expiringStories);

    // Find messages that will expire in 2-3 hours
    const expiringMessages = await Message.find({
      createdAt: {
        $gte: oneHourFromNow,
        $lt: twoHoursFromNow,
      },
    }).populate('sender');

    console.log('Expiring Messages:', expiringMessages);

    // Send notifications for stories
    // expiringStories.forEach(async story => {
    //   if (story.author?.phone) {
    //     const smsText = `Your story will disappear in 2 hours. Save it before it's gone!`;
    //     await sendSMS(story.author.phone, smsText);
    //   }
    // });

    // Send notifications for messages
    // expiringMessages.forEach(async message => {
    //   if (message.sender?.phone) {
    //     const smsText = `Your message will disappear in 2 hours. Save it before it's gone!`;
    //     await sendSMS(message.sender.phone, smsText);
    //   }
    // });
  } catch (err) {
    logger.error('[expiryNotification] Error sending notifications:', err);
  }
};

// Schedule notification job to run every minute (for testing)
cron.schedule('*/1 * * * *', sendExpiryNotifications);

export const storyDeleteJob = () => {
  // Every hour
  cron.schedule('0 * * * *', async () => {
    const now = Date.now();
    const threshold = new Date(now - 48 * 60 * 60 * 1000); // 24h ago

    try {
      // For most apps, a single deleteMany is fine:
      const res = await Story.deleteMany({ createdAt: { $lt: threshold } });
      if (res.deletedCount) {
        logger.info(
          colors.green(
            `[storyExpiry] Deleted ${res.deletedCount} expired stories @ ${new Date().toISOString()}`,
          ),
        );
      }
    } catch (err) {
      logger.error('[storyExpiry] Error deleting expired stories:', err);
    }
  });
};

// Message delete job

export const messageDeleteJob = () => {
  // Every hour
  cron.schedule('0 * * * *', async () => {
    const now = Date.now();
    const threshold = new Date(now - 48 * 60 * 60 * 1000); // 24h ago

    try {
      const res = await Message.deleteMany({ createdAt: { $lt: threshold } });
      if (res.deletedCount) {
        logger.info(
          colors.green(
            `[messageExpiry] Deleted ${res.deletedCount} expired messages @ ${new Date().toISOString()}`,
          ),
        );
      }
    } catch (err) {
      logger.error('[messageExpiry] Error deleting expired messages:', err);
    }
  });
};
