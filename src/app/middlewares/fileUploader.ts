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

/* ------------------------------- Types -------------------------------- */

type CloudinaryResourceType = 'image' | 'video' | 'raw';

export interface UploadedAsset {
  secureUrl: string; // MP4 output
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
    size?: number;
    fileType: keyof typeof fileValidators;
    returnType?: 'object' | 'url';
  };
}

/* --------------------------- File Validators --------------------------- */

export const fileValidators = {
  images: { validator: /^image\//, folder: 'images' },
  videos: { validator: /^video\//, folder: 'videos' },
  thumbnails: { validator: /^image\//, folder: 'thumbnails' },
  audios: { validator: /^audio\//, folder: 'audios' },
  documents: { validator: /(pdf|word|excel|text)/, folder: 'docs' },
  any: { validator: /.*/, folder: 'others' },
};

/* ----------------------------- Helpers -------------------------------- */

const getResourceTypeByMime = (mime: string): CloudinaryResourceType => {
  const m = (mime || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  return 'raw';
};

const getFolderByMime = (mime: string): string => {
  const matched = Object.values(fileValidators).find(v =>
    v.validator.test((mime || '').toLowerCase()),
  );
  return matched?.folder || 'others';
};

/* ----------------------------- Multer --------------------------------- */

const storage = multer.memoryStorage();

const fileFilter =
  (fields: UploadFields) =>
  (_: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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

/* ------------------------- Cloudinary Upload --------------------------- */

const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string,
): Promise<UploadedAsset> => {
  return new Promise((resolve, reject) => {
    try {
      const resourceType = getResourceTypeByMime(file.mimetype);
      const isVideo = resourceType === 'video';

      const uploadOptions: any = {
        folder,
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      };

      // 🎬 FORCE VIDEO → MP4 (REMOVE MOV COMPLETELY)
      if (isVideo) {
        uploadOptions.format = 'mp4';
        uploadOptions.video_codec = 'h264';
        uploadOptions.audio_codec = 'aac';
        uploadOptions.quality = 'auto:best';

        // ✅ HDR → SDR FIX (NO WASHOUT)
        uploadOptions.color_space = 'srgb';
        uploadOptions.color_primaries = 'bt709';
        uploadOptions.transfer_function = 'bt709';

        uploadOptions.flags = 'lossy';
      }

      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            errorLogger.error(chalk.red('Cloudinary upload error:'), error);
            return reject(error);
          }

          resolve({
            secureUrl: result?.secure_url ?? '',
            publicId: result?.public_id ?? '',
            resourceType:
              (result?.resource_type as CloudinaryResourceType) ?? 'raw',
            format: result?.format ?? null, // SHOULD NOW ALWAYS BE mp4
            bytes: result?.bytes ?? null,
            width: (result as any)?.width ?? null,
            height: (result as any)?.height ?? null,
            duration: (result as any)?.duration ?? null,
          });
        },
      );

      streamifier.createReadStream(file.buffer).pipe(stream);
    } catch (error) {
      errorLogger.error(chalk.red('Cloudinary exception:'), error);
      reject(error);
    }
  });
};

/* --------------------------- Main Middleware --------------------------- */

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

          let value: any;

          if (returnType === 'url') {
            const mapOne = (u: UploadedAsset) => u.secureUrl;
            value = wantsArray ? uploaded.map(mapOne) : mapOne(uploaded[0]);
          } else {
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

// cloudinary.config({
//   cloud_name: config.cloudinary.cloud_name,
//   api_key: config.cloudinary.api_key,
//   api_secret: config.cloudinary.api_secret,
// });

// type CloudinaryResourceType = 'image' | 'video' | 'raw';

// export interface UploadedAsset {
//   secureUrl: string; // Original (HDR preserved)
//   playbackUrl?: string; // SDR safe playback
//   publicId: string;
//   resourceType: CloudinaryResourceType;
//   format?: string | null;
//   bytes?: number | null;
//   width?: number | null;
//   height?: number | null;
//   duration?: number | null;
// }

// export interface UploadFields {
//   [field: string]: {
//     default?: string | string[] | UploadedAsset | UploadedAsset[] | null;
//     maxCount?: number;
//     size?: number; // bytes
//     fileType: keyof typeof fileValidators;
//     returnType?: 'object' | 'url';
//     delivery?: 'original' | 'playback';
//   };
// }

// export const fileValidators = {
//   images: { validator: /^image\//, folder: 'images' },
//   videos: { validator: /^video\//, folder: 'videos' },
//   thumbnails: { validator: /^image\//, folder: 'thumbnails' },
//   audios: { validator: /^audio\//, folder: 'audios' },
//   documents: { validator: /(pdf|word|excel|text)/, folder: 'docs' },
//   any: { validator: /.*/, folder: 'others' },
// };

// const getResourceTypeByMime = (mime: string): CloudinaryResourceType => {
//   const m = (mime || '').toLowerCase();
//   if (m.startsWith('image/')) return 'image';
//   if (m.startsWith('video/')) return 'video';
//   return 'raw';
// };

// const getFolderByMime = (mime: string): string => {
//   const matched = Object.values(fileValidators).find(v =>
//     v.validator.test((mime || '').toLowerCase()),
//   );
//   return matched?.folder || 'others';
// };

// const buildSDRPlaybackUrl = (publicId: string): string => {
//   return cloudinary.url(publicId, {
//     resource_type: 'video',
//     secure: true,
//     transformation: [
//       {
//         format: 'mp4',
//         video_codec: 'h264',
//         audio_codec: 'aac',
//         quality: 'auto:best',
//         color_space: 'srgb',
//         color_primaries: 'bt709',
//         transfer_function: 'bt709',
//       },
//     ],
//   });
// };

// const storage = multer.memoryStorage();

// const fileFilter =
//   (fields: UploadFields) =>
//   (_: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
//     const fieldType = Object.keys(fields).find(f => file.fieldname === f);
//     const fileType = fieldType ? fields[fieldType]?.fileType : undefined;

//     if (fileType && fileValidators[fileType]?.validator.test(file.mimetype)) {
//       return cb(null, true);
//     }

//     cb(
//       new AppError(
//         StatusCodes.BAD_REQUEST,
//         `${file.originalname} is not a valid ${fileType ?? 'requested'} file`,
//       ),
//     );
//   };

// const upload = (fields: UploadFields) => {
//   const maxSize = Math.max(
//     ...Object.values(fields).map(f => f.size || 50 * 1024 * 1024),
//   );

//   return multer({
//     storage,
//     fileFilter: fileFilter(fields),
//     limits: { fileSize: maxSize },
//   }).fields(
//     Object.keys(fields).map(field => ({
//       name: field,
//       maxCount: fields[field].maxCount || 1,
//     })),
//   );
// };

// const uploadToCloudinary = async (
//   file: Express.Multer.File,
//   folder: string,
// ): Promise<UploadedAsset> => {
//   return new Promise((resolve, reject) => {
//     try {
//       const resourceType = getResourceTypeByMime(file.mimetype);
//       const isVideo = resourceType === 'video';

//       const uploadOptions: any = {
//         folder,
//         resource_type: resourceType,
//         use_filename: true,
//         unique_filename: true,
//         overwrite: false,
//       };

//       if (isVideo) {
//         uploadOptions.eager = [
//           {
//             format: 'mp4',
//             video_codec: 'h264',
//             audio_codec: 'aac',
//             quality: 'auto:best',

//             // ✅ HDR → SDR conversion
//             color_space: 'srgb',
//             color_primaries: 'bt709',
//             transfer_function: 'bt709',

//             flags: 'lossy',
//           },
//         ];

//         uploadOptions.eager_async = false;
//       }

//       const stream = cloudinary.uploader.upload_stream(
//         uploadOptions,
//         (error, result) => {
//           if (error) {
//             errorLogger.error(chalk.red('Cloudinary upload error:'), error);
//             return reject(error);
//           }

//           const originalUrl = result?.secure_url ?? '';

//           let playbackUrl: string | undefined;
//           if (isVideo && result?.eager?.length) {
//             playbackUrl = result.eager[0].secure_url;
//           }

//           resolve({
//             secureUrl: originalUrl, // HDR preserved
//             playbackUrl, // SDR safe
//             publicId: result?.public_id ?? '',
//             resourceType:
//               (result?.resource_type as CloudinaryResourceType) ?? 'raw',
//             format: result?.format ?? null,
//             bytes: result?.bytes ?? null,
//             width: (result as any)?.width ?? null,
//             height: (result as any)?.height ?? null,
//             duration: (result as any)?.duration ?? null,
//           });
//         },
//       );

//       streamifier.createReadStream(file.buffer).pipe(stream);
//     } catch (error) {
//       errorLogger.error(chalk.red('Cloudinary exception:'), error);
//       reject(error);
//     }
//   });
// };

// /* --------------------------- Main Middleware --------------------------- */

// const fileUploader = (fields: UploadFields) =>
//   catchAsync(async (req, res, next) => {
//     try {
//       await new Promise<void>((resolve, reject) =>
//         upload(fields)(req, res, err => (err ? reject(err) : resolve())),
//       );

//       const files = req.files as { [field: string]: Express.Multer.File[] };

//       for (const field of Object.keys(fields)) {
//         if (files?.[field]?.length) {
//           const targetFolder =
//             fileValidators[fields[field].fileType]?.folder ??
//             getFolderByMime(files[field][0].mimetype);

//           const uploaded = await Promise.all(
//             files[field].map(file => uploadToCloudinary(file, targetFolder)),
//           );

//           const wantsArray = (fields[field]?.maxCount || 1) > 1;
//           const returnType = fields[field]?.returnType ?? 'object';
//           const delivery = fields[field]?.delivery ?? 'original';
//           const isVideoField = fields[field].fileType === 'videos';

//           let value: any;

//           if (returnType === 'url') {
//             const mapOne = (u: UploadedAsset) => {
//               if (isVideoField && delivery === 'playback') {
//                 return u.playbackUrl || buildSDRPlaybackUrl(u.publicId);
//               }
//               return u.secureUrl;
//             };

//             value = wantsArray ? uploaded.map(mapOne) : mapOne(uploaded[0]);
//           } else {
//             value = wantsArray ? uploaded : uploaded[0];
//           }

//           req.body[field] = value;
//         } else {
//           req.body[field] = fields[field].default;
//         }
//       }
//     } catch (error) {
//       errorLogger.error(error);
//       Object.keys(fields).forEach(
//         field => (req.body[field] = fields[field].default),
//       );
//     } finally {
//       if (req.body?.data) {
//         Object.assign(req.body, JSON.parse(req.body.data));
//         delete req.body.data;
//       }
//       next();
//     }
//   });

// export default fileUploader;
