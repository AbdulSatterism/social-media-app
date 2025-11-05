/* eslint-disable @typescript-eslint/no-explicit-any */
import cron from 'node-cron';
import { logger } from '../shared/logger';
import colors from 'colors';
import { Story } from '../app/modules/story/story.model';
import { sendSMS } from './verifyByTwilio';

// Send SMS notifications before deleting stories and messages
const sendExpiryNotifications = async () => {
  const now = Date.now();
  const twoHoursFromNow = new Date(now + 2 * 60 * 60 * 1000); // 2 hours from now
  const threeHoursFromNow = new Date(now + 3 * 60 * 60 * 1000); // 3 hours from now

  try {
    // Find stories that will expire in 2-3 hours
    const expiringStories = await Story.find({
      createdAt: {
        $gte: threeHoursFromNow,
        $lt: twoHoursFromNow,
      },
    }).populate('author');

    // Send notifications for stories (unique phones only)
    const storyPhones = new Set<string>();
    expiringStories.forEach(story => {
      const author = story.author as any;
      const phone = (author?.phone as string | undefined)?.trim();
      if (phone) storyPhones.add(phone);
    });

    for (const phone of storyPhones) {
      try {
        const smsText = `Your re: disappears in 2 hours, save to your photo gallery before it's gone!`;
        await sendSMS(phone, smsText);
      } catch (err) {
        logger.error('Error sending story SMS to ' + phone, err);
      }
    }
  } catch (err) {
    logger.error('[expiryNotification] Error sending notifications:', err);
  }
};

// Schedule the job to run every hour
cron.schedule('0 * * * *', sendExpiryNotifications);

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

// export const messageDeleteJob = () => {
//   // Every hour
//   cron.schedule('0 * * * *', async () => {
//     const now = Date.now();
//     const threshold = new Date(now - 48 * 60 * 60 * 1000); // 24h ago

//     try {
//       const res = await Message.deleteMany({ createdAt: { $lt: threshold } });
//       if (res.deletedCount) {
//         logger.info(
//           colors.green(
//             `[messageExpiry] Deleted ${res.deletedCount} expired messages @ ${new Date().toISOString()}`,
//           ),
//         );
//       }
//     } catch (err) {
//       logger.error('[messageExpiry] Error deleting expired messages:', err);
//     }
//   });
// };
