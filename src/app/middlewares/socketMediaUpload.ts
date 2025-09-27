import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import process from 'process';
/**
 * Ensure folder exists
 */
const ensureDir = async (dir: string) => {
  if (!fsSync.existsSync(dir)) await fs.mkdir(dir, { recursive: true });
};

/**
 * Save base64 media
 */
export const saveSocketMedia = async (
  base64Data: string,
  folder: 'images' | 'videos',
) => {
  const ext = folder === 'images' ? '.jpg' : '.mp4';
  const fileName = `${Date.now()}${ext}`;
  const dir = path.join(process.cwd(), 'uploads', folder);
  await ensureDir(dir);

  const filePath = path.join(dir, fileName);
  const base64Content = base64Data.replace(/^data:.*;base64,/, '');
  await fs.writeFile(filePath, base64Content, 'base64');

  return `/uploads/${folder}/${fileName}`;
};
