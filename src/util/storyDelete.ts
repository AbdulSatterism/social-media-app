import cron from 'node-cron';
import { logger } from '../shared/logger';
import colors from 'colors';
import { Story } from '../app/modules/story/story.model';

export const storyDeleteJob = () => {
  // Every hour
  cron.schedule('0 * * * *', async () => {
    const now = Date.now();
    const threshold = new Date(now - 24 * 60 * 60 * 1000); // 24h ago

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
