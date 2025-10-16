import cron from 'node-cron';
import { logger } from '../shared/logger';
import colors from 'colors';
import { Story } from '../app/modules/story/story.model';
import { Message } from '../app/modules/message/message.model';

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
