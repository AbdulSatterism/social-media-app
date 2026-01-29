/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
import { StatusCodes } from 'http-status-codes';
import multer, { FileFilterCallback } from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import catchAsync from '../../shared/catchAsync';
import { errorLogger } from '../../shared/logger';
import AppError from '../errors/AppError';
import config from '../../config';
import chalk from 'chalk';

cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

type CloudinaryResourceType = 'image' | 'video' | 'raw';

export const fileValidators = {
  images: { validator: /^image\//, folder: 'images' },
  videos: { validator: /^video\//, folder: 'videos' },
  thumbnails: { validator: /^image\//, folder: 'thumbnails' },
  audios: { validator: /^audio\//, folder: 'audios' },
  documents: { validator: /(pdf|word|excel|text)/, folder: 'docs' },
  any: { validator: /.*/, folder: 'others' },
};

export const fileTypes = Object.keys(
  fileValidators,
) as (keyof typeof fileValidators)[];

export interface UploadedAsset {
  secureUrl: string;
  publicId: string;
  resourceType: CloudinaryResourceType;
  format?: string | null;
  bytes?: number | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
}

export interface UploadFields {
  [field: string]: {
    default?: string | string[] | UploadedAsset | UploadedAsset[] | null;
    maxCount?: number;
    size?: number; // bytes
    fileType: (typeof fileTypes)[number];
    returnType?: 'object' | 'url';
    delivery?: 'original' | 'playback';
    hdrMode?: 'pq' | 'hlg' | 'none';
  };
}

const getResourceTypeByMime = (mime: string): CloudinaryResourceType => {
  const m = (mime || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'raw';
  return 'raw';
};

const getFolderByMime = (mime: string): string => {
  const matched = Object.values(fileValidators).find(v =>
    v.validator.test((mime || '').toLowerCase()),
  );
  return matched?.folder || 'others';
};

const buildVideoPlaybackUrl = (
  publicId: string,
  hdr: 'none' | 'hlg' | 'pq' = 'pq',
): string => {
  const url = cloudinary.url(publicId, {
    resource_type: 'video',
    type: 'upload',
    secure: true,
  });

  return url;
};

const storage = multer.memoryStorage();

const fileFilter =
  (fields: UploadFields) =>
  (_: any, file: Express.Multer.File, cb: FileFilterCallback) => {
    const fieldType = Object.keys(fields).find(f => file.fieldname === f);
    const fileType = fieldType ? fields[fieldType]?.fileType : undefined;

    if (fileType && fileValidators[fileType]?.validator.test(file.mimetype)) {
      return cb(null, true);
    }

    cb(
      new AppError(
        StatusCodes.BAD_REQUEST,
        `${file.originalname} is not a valid ${fileType ?? 'requested'} file`,
      ),
    );
  };

const upload = (fields: UploadFields) => {
  const maxSize = Math.max(
    ...Object.values(fields).map(f => f.size || 50 * 1024 * 1024),
  );

  return multer({
    storage,
    fileFilter: fileFilter(fields),
    limits: { fileSize: maxSize },
  }).fields(
    Object.keys(fields).map(field => ({
      name: field,
      maxCount: fields[field].maxCount || 1,
    })),
  );
};

const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string,
): Promise<UploadedAsset> => {
  return new Promise<UploadedAsset>((resolve, reject) => {
    try {
      const resource_type = getResourceTypeByMime(file.mimetype);
      const isVideo = resource_type === 'video';

      const uploadOptions: any = {
        folder,
        resource_type,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      };

      if (isVideo) {
        uploadOptions.eager = [
          {
            format: 'mp4',
            video_codec: 'h264',
            audio_codec: 'aac',
            quality: 'auto:best',
            flags: 'lossy',
          },
        ];
        uploadOptions.eager_async = false; // Process immediately
      }

      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            errorLogger.error(chalk.red('Cloudinary upload error:'), error);
            return reject(error);
          }

          // For videos with eager transformation, use the SDR-converted version
          let secureUrl = result?.secure_url ?? '';
          if (isVideo && result?.eager && result.eager.length > 0) {
            secureUrl = result.eager[0].secure_url;
          }

          resolve({
            secureUrl,
            publicId: result?.public_id ?? '',
            resourceType:
              (result?.resource_type as CloudinaryResourceType) ?? 'raw',
            format: result?.format ?? null,
            bytes: result?.bytes ?? null,
            width: (result as any)?.width ?? null,
            height: (result as any)?.height ?? null,
            duration: (result as any)?.duration ?? null,
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(stream);
    } catch (error) {
      errorLogger.error(chalk.red('Cloudinary upload exception:'), error);
      reject(error);
    }
  });
};

const fileUploader = (fields: UploadFields) =>
  catchAsync(async (req, res, next) => {
    try {
      await new Promise<void>((resolve, reject) =>
        upload(fields)(req, res, err => (err ? reject(err) : resolve())),
      );

      const files = req.files as { [field: string]: Express.Multer.File[] };

      for (const field of Object.keys(fields)) {
        if (files?.[field]?.length) {
          const targetFolder =
            fileValidators[fields[field].fileType]?.folder ??
            getFolderByMime(files[field][0].mimetype);

          const uploaded = await Promise.all(
            files[field].map(file => uploadToCloudinary(file, targetFolder)),
          );

          const wantsArray = (fields[field]?.maxCount || 1) > 1;

          const returnType = fields[field]?.returnType ?? 'object';
          const delivery = fields[field]?.delivery ?? 'original';
          const hdrMode = fields[field]?.hdrMode ?? 'pq';
          const isVideoField = fields[field].fileType === 'videos';

          let value: any;

          if (returnType === 'url') {
            if (isVideoField && delivery === 'playback') {
              const mapOne = (u: UploadedAsset) =>
                buildVideoPlaybackUrl(u.publicId, hdrMode);
              value = wantsArray ? uploaded.map(mapOne) : mapOne(uploaded[0]);
            } else {
              const mapOne = (u: UploadedAsset) => u.secureUrl;
              value = wantsArray ? uploaded.map(mapOne) : mapOne(uploaded[0]);
            }
          } else {
            // Return full object with metadata
            value = wantsArray ? uploaded : uploaded[0];
          }

          req.body[field] = value;
        } else {
          req.body[field] = fields[field].default;
        }
      }
    } catch (error) {
      errorLogger.error(error);
      Object.keys(fields).forEach(
        field => (req.body[field] = fields[field].default),
      );
    } finally {
      if (req.body?.data) {
        Object.assign(req.body, JSON.parse(req.body.data));
        delete req.body.data;
      }
      next();
    }
  });

export default fileUploader;
