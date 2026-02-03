/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
import { StatusCodes } from 'http-status-codes';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import catchAsync from '../../shared/catchAsync';
import AppError from '../errors/AppError';
import config from '../../config';

cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

type CloudinaryResourceType = 'image' | 'video' | 'raw';

export interface UploadedAsset {
  secureUrl: string;
  playbackUrl?: string;
  hdrPlaybackUrl?: string;

  publicId: string;
  resourceType: CloudinaryResourceType;
  format?: string | null;
}

export interface UploadField {
  fileType: 'images' | 'videos' | 'thumbnails' | 'audios' | 'documents' | 'any';
  maxCount?: number;
  size?: number;
  returnType?: 'url' | 'object';
  delivery?: 'original' | 'playback';
  platformVariants?: boolean;
}

export type UploadFields = Record<string, UploadField>;

const storage = multer.memoryStorage();

export const fileValidators = {
  images: { validator: /^image\//, folder: 'images' },
  videos: { validator: /^video\//, folder: 'videos' },
  audios: { validator: /^audio\//, folder: 'audios' },
  thumbnails: { validator: /^image\//, folder: 'thumbnails' },
  documents: { validator: /(pdf|word|excel|text)/, folder: 'docs' },
  any: { validator: /.*/, folder: 'others' },
};

const getResourceType = (mime: string): CloudinaryResourceType => {
  const m = (mime || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  return 'raw';
};

const buildSdrPlaybackUrl = (publicId: string) => {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    secure: true,
    format: 'mp4',
    transformation: [
      {
        video_codec: 'h264',
        audio_codec: 'aac',
        quality: 'auto:good',
        flags: 'progressive',
      },
    ],
  });
};

const buildHdrPlaybackUrl = (publicId: string) => {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    secure: true,
    format: 'mp4',
    transformation: [
      {
        dynamic_range: 'high', // dr_high
        video_codec: 'h265', // vc_h265
        audio_codec: 'aac',
        quality: 'auto:best',
      },
    ],
  });
};

const buildOptimizedImageUrl = (publicId: string) => {
  return cloudinary.url(publicId, {
    resource_type: 'image',
    secure: true,
    transformation: [
      {
        fetch_format: 'auto',
        quality: 'auto',
      },
    ],
  });
};

const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string,
): Promise<UploadedAsset> => {
  return new Promise((resolve, reject) => {
    try {
      const resourceType = getResourceType(file.mimetype);
      const isVideo = resourceType === 'video';
      const isImage = resourceType === 'image';
      const options: any = {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      };
      if (isVideo) {
        options.eager = [
          {
            format: 'mp4',
            video_codec: 'h264',
            audio_codec: 'aac',
            quality: 'auto:good',
            flags: 'progressive',
          },
          {
            format: 'mp4',
            dynamic_range: 'high',
            video_codec: 'h265',
            audio_codec: 'aac',
            quality: 'auto:best',
          },
        ];
        options.eager_async = true;
      }

      const stream = cloudinary.uploader.upload_stream(
        options,
        (error: any, result: any) => {
          if (error || !result) return reject(error);

          const publicId = result.public_id as string;

          const sdrPlaybackUrl = isVideo
            ? buildSdrPlaybackUrl(publicId)
            : undefined;
          const hdrPlaybackUrl = isVideo
            ? buildHdrPlaybackUrl(publicId)
            : undefined;

          resolve({
            secureUrl: result.secure_url,
            playbackUrl: sdrPlaybackUrl,
            hdrPlaybackUrl,
            publicId,
            resourceType,
            format: result.format,
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(stream);
    } catch (err) {
      reject(err);
    }
  });
};

const fileFilter =
  (fields: UploadFields) =>
  (_: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const fieldConfig = fields[file.fieldname];
    const rule = fileValidators[fieldConfig?.fileType || 'any'];

    if (!rule.validator.test(file.mimetype)) {
      return cb(new Error(`Invalid file type: ${file.mimetype}`));
    }

    cb(null, true);
  };

const fileUploader = (fields: UploadFields) =>
  catchAsync(async (req, res, next) => {
    const maxSize = Math.max(
      ...Object.values(fields).map(f => f.size || 50 * 1024 * 1024),
    );

    const upload = multer({
      storage,
      fileFilter: fileFilter(fields),
      limits: { fileSize: maxSize },
    }).fields(
      Object.entries(fields).map(([name, cfg]) => ({
        name,
        maxCount: cfg.maxCount || 1,
      })),
    );

    upload(req, res, async err => {
      if (err) {
        return next(
          new AppError(StatusCodes.BAD_REQUEST, err.message || 'Upload failed'),
        );
      }

      req.body.uploadedFiles = {};

      for (const field in fields) {
        const cfg = fields[field];
        const files = (req.files as any)?.[field] || [];
        if (!files.length) continue;

        const folder = fileValidators[cfg.fileType]?.folder || 'others';

        const uploaded = await Promise.all(
          files.map((f: Express.Multer.File) => uploadToCloudinary(f, folder)),
        );

        const wantsArray = (cfg.maxCount || 1) > 1;
        const returnType = cfg.returnType || 'object';
        const delivery = cfg.delivery || 'original';

        const isVideo = cfg.fileType === 'videos';
        const isImage =
          cfg.fileType === 'images' || cfg.fileType === 'thumbnails';

        const getNormalUrl = (u: UploadedAsset) => {
          if (isVideo) {
            return u.playbackUrl || u.secureUrl;
          }
          if (isImage) {
            return buildOptimizedImageUrl(u.publicId);
          }
          return u.secureUrl;
        };

        const getIosUrl = (u: UploadedAsset) => {
          return u.secureUrl;
        };

        const mapFn = (u: UploadedAsset) => {
          if (returnType === 'url') {
            if (isVideo && delivery === 'playback') return getNormalUrl(u);
            return u.secureUrl;
          }
          return u;
        };

        const finalValue = wantsArray
          ? uploaded.map(mapFn)
          : mapFn(uploaded[0]);
        req.body.uploadedFiles[field] = finalValue;
        req.body[field] = finalValue;
        if (cfg.platformVariants) {
          const iosKey = `${field}_ios`;
          const normalKey = `${field}_normal`;

          const iosValue = wantsArray
            ? uploaded.map(u => (returnType === 'url' ? getIosUrl(u) : u))
            : returnType === 'url'
              ? getIosUrl(uploaded[0])
              : uploaded[0];

          const normalValue = wantsArray
            ? uploaded.map(u => (returnType === 'url' ? getNormalUrl(u) : u))
            : returnType === 'url'
              ? getNormalUrl(uploaded[0])
              : uploaded[0];

          req.body.uploadedFiles[iosKey] = iosValue;
          req.body.uploadedFiles[normalKey] = normalValue;

          req.body[iosKey] = iosValue;
          req.body[normalKey] = normalValue;
        }
      }
      if (req.body?.data && typeof req.body.data === 'string') {
        try {
          Object.assign(req.body, JSON.parse(req.body.data));
          delete req.body.data;
        } catch {
          return next(
            new AppError(StatusCodes.BAD_REQUEST, '`data` must be valid JSON'),
          );
        }
      }

      next();
    });
  });

export default fileUploader;

// /* eslint-disable no-unused-vars */
// /* eslint-disable @typescript-eslint/no-unused-vars */
// /* eslint-disable @typescript-eslint/no-explicit-any */
// /* eslint-disable no-undef */
// import { StatusCodes } from 'http-status-codes';
// import multer, { FileFilterCallback } from 'multer';
// import { v2 as cloudinary } from 'cloudinary';
// import streamifier from 'streamifier';
// import catchAsync from '../../shared/catchAsync';
// import { errorLogger } from '../../shared/logger';
// import AppError from '../errors/AppError';
// import config from '../../config';
// import chalk from 'chalk';

// cloudinary.config({
//   cloud_name: config.cloudinary.cloud_name,
//   api_key: config.cloudinary.api_key,
//   api_secret: config.cloudinary.api_secret,
// });

// type CloudinaryResourceType = 'image' | 'video' | 'raw';

// export interface UploadedAsset {
//   secureUrl: string;
//   playbackUrl?: string;
//   publicId: string;
//   resourceType: CloudinaryResourceType;
//   format?: string | null;
// }

// export interface UploadField {
//   fileType: 'images' | 'videos' | 'thumbnails' | 'audios' | 'documents' | 'any';
//   maxCount?: number;
//   size?: number;
//   returnType?: 'url' | 'object';
//   delivery?: 'original' | 'playback';
// }

// export type UploadFields = Record<string, UploadField>;

// const storage = multer.memoryStorage();

// export const fileValidators = {
//   images: { validator: /^image\//, folder: 'images' },
//   videos: { validator: /^video\//, folder: 'videos' },
//   audios: { validator: /^audio\//, folder: 'audios' },
//   thumbnails: { validator: /^image\//, folder: 'thumbnails' },
//   documents: { validator: /(pdf|word|excel|text)/, folder: 'docs' },
//   any: { validator: /.*/, folder: 'others' },
// };

// const getResourceType = (mime: string): CloudinaryResourceType => {
//   const m = (mime || '').toLowerCase();
//   if (m.startsWith('image/')) return 'image';
//   if (m.startsWith('video/')) return 'video';
//   return 'raw';
// };

// const buildMp4PlaybackUrl = (publicId: string) => {
//   return cloudinary.url(publicId, {
//     resource_type: 'video',
//     secure: true,
//     format: 'mp4',
//     transformation: [
//       {
//         video_codec: 'h264',
//         audio_codec: 'aac',
//         quality: 'auto:best',
//         flags: 'progressive',
//       },
//     ],
//   });
// };

// const uploadToCloudinary = async (
//   file: Express.Multer.File,
//   folder: string,
// ): Promise<UploadedAsset> => {
//   return new Promise((resolve, reject) => {
//     try {
//       const resourceType = getResourceType(file.mimetype);
//       const isVideo = resourceType === 'video';

//       const options: any = {
//         folder,
//         resource_type: resourceType,
//         use_filename: true,
//         unique_filename: true,
//         overwrite: false,
//       };

//       if (isVideo) {
//         options.format = 'mp4';
//         options.video_codec = 'h264';
//         options.audio_codec = 'aac';
//         options.quality = 'auto:best';
//       }

//       const stream = cloudinary.uploader.upload_stream(
//         options,
//         (error, result) => {
//           if (error || !result) return reject(error);

//           resolve({
//             secureUrl: result.secure_url,
//             playbackUrl: isVideo
//               ? buildMp4PlaybackUrl(result.public_id)
//               : undefined,
//             publicId: result.public_id,
//             resourceType,
//             format: result.format,
//           });
//         },
//       );

//       streamifier.createReadStream(file.buffer).pipe(stream);
//     } catch (err) {
//       reject(err);
//     }
//   });
// };

// const fileFilter =
//   (fields: UploadFields) =>
//   (_: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
//     const fieldConfig = fields[file.fieldname];
//     const rule = fileValidators[fieldConfig?.fileType || 'any'];

//     if (!rule.validator.test(file.mimetype)) {
//       return cb(new Error(`Invalid file type: ${file.mimetype}`));
//     }

//     cb(null, true);
//   };

// const fileUploader = (fields: UploadFields) =>
//   catchAsync(async (req, res, next) => {
//     const maxSize = Math.max(
//       ...Object.values(fields).map(f => f.size || 50 * 1024 * 1024),
//     );

//     const upload = multer({
//       storage,
//       fileFilter: fileFilter(fields),
//       limits: { fileSize: maxSize },
//     }).fields(
//       Object.entries(fields).map(([name, cfg]) => ({
//         name,
//         maxCount: cfg.maxCount || 1,
//       })),
//     );

//     upload(req, res, async err => {
//       if (err) return next(err);

//       req.body.uploadedFiles = {};

//       for (const field in fields) {
//         const files = (req.files as any)?.[field] || [];
//         if (!files.length) continue;

//         const folder =
//           fileValidators[fields[field].fileType]?.folder || 'others';

//         const uploaded = await Promise.all(
//           files.map((f: Express.Multer.File) => uploadToCloudinary(f, folder)),
//         );

//         const wantsArray = (fields[field].maxCount || 1) > 1;
//         const returnType = fields[field].returnType || 'object';
//         const delivery = fields[field].delivery || 'original';
//         const isVideo = fields[field].fileType === 'videos';

//         const mapFn = (u: UploadedAsset) => {
//           if (returnType === 'url') {
//             if (isVideo && delivery === 'playback') {
//               return u.playbackUrl || u.secureUrl;
//             }
//             return u.secureUrl;
//           }
//           return u;
//         };

//         const finalValue = wantsArray
//           ? uploaded.map(mapFn)
//           : mapFn(uploaded[0]);

//         req.body.uploadedFiles[field] = finalValue;
//         req.body[field] = finalValue;
//       }

//       // ✅ Parse JSON multipart `data`
//       if (req.body?.data && typeof req.body.data === 'string') {
//         Object.assign(req.body, JSON.parse(req.body.data));
//         delete req.body.data;
//       }

//       next();
//     });
//   });

// export default fileUploader;
