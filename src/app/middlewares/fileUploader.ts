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
  secureUrl: string; // original, non-transformed URL
  publicId: string; // for building delivery URLs
  resourceType: CloudinaryResourceType;
  format?: string | null;
  bytes?: number | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null; // for video/audio
}

export interface UploadFields {
  [field: string]: {
    default?: string | string[] | UploadedAsset | UploadedAsset[] | null;
    maxCount?: number; // default 1
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

// Fallback: folder by MIME if field->fileType mapping is missing
const getFolderByMime = (mime: string): string => {
  const matched = Object.values(fileValidators).find(v =>
    v.validator.test((mime || '').toLowerCase()),
  );
  return matched?.folder || 'others';
};

// Build a browser-safe SDR/sRGB playback URL from a publicId.
export function buildVideoPlaybackUrl(
  publicId: string,
  hdr: 'none' | 'hlg' | 'pq' = 'pq',
) {
  const transformation: any[] = [];
  if (hdr === 'hlg') transformation.push({ effect: 'tone_map:hlg' });
  if (hdr === 'pq') transformation.push({ effect: 'tone_map:pq' });

  transformation.push(
    { color_space: 'srgb' }, // normalize gamut
    { fetch_format: 'mp4' }, // mp4 container
    { video_codec: 'h264' }, // wide browser support
  );

  return cloudinary.url(publicId, {
    resource_type: 'video',
    type: 'upload',
    transformation,
    secure: true,
  });
}

// Derive SDR/sRGB playback URL from a stored secureUrl (no publicId).
export function toPlaybackUrlFromSecure(
  secureUrl: string,
  hdr: 'none' | 'hlg' | 'pq' = 'pq',
) {
  try {
    const u = new URL(secureUrl);
    const parts = u.pathname.split('/upload/');
    if (parts.length !== 2) return secureUrl;

    const tone =
      hdr === 'hlg' ? 'e_tone_map:hlg/' : hdr === 'pq' ? 'e_tone_map:pq/' : '';
    const inject = `${tone}e_color_space:srgb/f_mp4,vc_h264/`;

    u.pathname = `${parts[0]}/upload/${inject}${parts[1]}`.replace(
      /\.(mov|hevc|heif|webm|mkv)$/i,
      '.mp4',
    );
    return u.toString();
  } catch {
    return secureUrl;
  }
}

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
    ...Object.values(fields).map(f => f.size || 5 * 1024 * 1024),
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

export interface UploadedInternal extends UploadedAsset {}

const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string,
): Promise<UploadedInternal> => {
  return new Promise<UploadedInternal>((resolve, reject) => {
    try {
      const resource_type = getResourceTypeByMime(file.mimetype);

      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type,
          use_filename: true, // keep base name
          unique_filename: true, // avoid collisions
          overwrite: false, // never overwrite existing
        },
        (error, result) => {
          if (error) return reject(error);

          resolve({
            secureUrl: result?.secure_url ?? '',
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
      errorLogger.error(chalk.red('Cloudinary upload error:'), error);
      reject(error);
    }
  });
};

const fileUploader = (fields: UploadFields) =>
  catchAsync(async (req, res, next) => {
    try {
      // Run multer to populate req.files
      await new Promise<void>((resolve, reject) =>
        upload(fields)(req, res, err => (err ? reject(err) : resolve())),
      );

      const files = req.files as { [field: string]: Express.Multer.File[] };

      for (const field of Object.keys(fields)) {
        if (files?.[field]?.length) {
          // Choose folder from declared fileType; fallback to MIME if missing
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

          let value: any;

          if (returnType === 'url') {
            // URL-only return
            if (
              fields[field].fileType === 'videos' &&
              delivery === 'playback'
            ) {
              // Return a color-safe playback URL (SDR/sRGB) instead of the original
              const mapOne = (u: UploadedInternal) =>
                buildVideoPlaybackUrl(u.publicId, hdrMode);
              value = wantsArray ? uploaded.map(mapOne) : mapOne(uploaded[0]);
            } else {
              // Return original URL
              const mapOne = (u: UploadedInternal) => u.secureUrl;
              value = wantsArray ? uploaded.map(mapOne) : mapOne(uploaded[0]);
            }
          } else {
            // object return (full metadata)
            value = wantsArray ? uploaded : uploaded[0];
          }

          req.body[field] = value;
        } else {
          req.body[field] = fields[field].default;
        }
      }
    } catch (error) {
      errorLogger.error(error);
      // Ensure all declared fields exist on body even on error
      Object.keys(fields).forEach(
        field => (req.body[field] = fields[field].default),
      );
    } finally {
      // Merge JSON payload if front-end sent other data in 'data'
      if (req.body?.data) {
        Object.assign(req.body, JSON.parse(req.body.data));
        delete req.body.data;
      }
      next();
    }
  });

export default fileUploader;

// ------------------------------
// Cloudinary configuration
// ------------------------------

// // Cloudinary config
// cloudinary.config({
//   cloud_name: config.cloudinary.cloud_name,
//   api_key: config.cloudinary.api_key,
//   api_secret: config.cloudinary.api_secret,
// });

// type CloudinaryResourceType = 'image' | 'video' | 'raw';

// // Stricter validators (no octet-stream under image/video)
// export const fileValidators = {
//   images: { validator: /^image\//, folder: 'images' },
//   videos: { validator: /^video\//, folder: 'videos' },
//   thumbnails: { validator: /^image\//, folder: 'thumbnails' },
//   audios: { validator: /^audio\//, folder: 'audios' },
//   documents: { validator: /(pdf|word|excel|text)/, folder: 'docs' },
//   any: { validator: /.*/, folder: 'others' },
// };

// export const fileTypes = Object.keys(
//   fileValidators,
// ) as (keyof typeof fileValidators)[];

// interface UploadFields {
//   [field: string]: {
//     default?: string | string[] | null;
//     maxCount?: number;
//     size?: number; // bytes
//     fileType: (typeof fileTypes)[number];
//   };
// }

// const getResourceTypeByMime = (mime: string): CloudinaryResourceType => {
//   const m = (mime || '').toLowerCase();
//   if (m.startsWith('image/')) return 'image';
//   if (m.startsWith('video/')) return 'video';
//   if (m.startsWith('audio/')) return 'raw';
//   return 'raw';
// };

// const getFolderByMime = (mime: string): string => {
//   const matched = Object.values(fileValidators).find(v =>
//     v.validator.test((mime || '').toLowerCase()),
//   );
//   return matched?.folder || 'others';
// };

// const storage = multer.memoryStorage();

// const fileFilter =
//   (fields: UploadFields) =>
//   (_: any, file: Express.Multer.File, cb: FileFilterCallback) => {
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

// /**
//  * Upload a single file buffer to Cloudinary as original (no transforms).
//  */
// const uploadToCloudinary = async (
//   file: Express.Multer.File,
//   folder: string,
// ): Promise<string> => {
//   return new Promise<string>((resolve, reject) => {
//     try {
//       const resource_type = getResourceTypeByMime(file.mimetype);

//       const stream = cloudinary.uploader.upload_stream(
//         {
//           folder,
//           resource_type,
//           use_filename: true,
//           unique_filename: true,
//           overwrite: false,
//         },
//         (error, result) => {
//           if (error) return reject(error);
//           resolve(result?.secure_url ?? '');
//         },
//       );

//       streamifier.createReadStream(file.buffer).pipe(stream);
//     } catch (error) {
//       errorLogger.error(chalk.red('Cloudinary upload error:'), error);
//       reject(error);
//     }
//   });
// };

// const fileUploader = (fields: UploadFields) =>
//   catchAsync(async (req, res, next) => {
//     try {
//       // Run multer
//       await new Promise<void>((resolve, reject) =>
//         upload(fields)(req, res, err => (err ? reject(err) : resolve())),
//       );

//       const files = req.files as { [field: string]: Express.Multer.File[] };

//       for (const field of Object.keys(fields)) {
//         if (files?.[field]?.length) {
//           const targetFolder =
//             fileValidators[fields[field].fileType]?.folder ??
//             getFolderByMime(files[field][0].mimetype); // fallback only

//           const uploadedFiles = await Promise.all(
//             files[field].map(file => uploadToCloudinary(file, targetFolder)),
//           );

//           req.body[field] =
//             (fields[field]?.maxCount || 1) > 1
//               ? uploadedFiles
//               : uploadedFiles[0];
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
