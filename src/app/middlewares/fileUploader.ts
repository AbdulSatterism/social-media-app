/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
import type { Express } from 'express';
import { StatusCodes } from 'http-status-codes';
import multer, { FileFilterCallback } from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import catchAsync from '../../shared/catchAsync';
import { errorLogger } from '../../shared/logger';
import AppError from '../errors/AppError';
import config from '../../config';
import chalk from 'chalk';

// Cloudinary config
cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

type CloudinaryResourceType = 'image' | 'video' | 'raw';

// Stricter validators (no octet-stream under image/video)
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

interface UploadFields {
  [field: string]: {
    default?: string | string[] | null;
    maxCount?: number;
    size?: number; // bytes
    fileType: (typeof fileTypes)[number];
  };
}

const getResourceTypeByMime = (mime: string): CloudinaryResourceType => {
  const m = (mime || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'raw';
  return 'raw';
};

/**
 * Fallback folder by MIME if the field's fileType is missing.
 */
const getFolderByMime = (mime: string): string => {
  const matched = Object.values(fileValidators).find(v =>
    v.validator.test((mime || '').toLowerCase()),
  );
  return matched?.folder || 'others';
};

/**
 * Multer memory storage (temporary buffer prior to Cloudinary).
 */
const storage = multer.memoryStorage();

/**
 * File filter by declared field fileType.
 */
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

/**
 * Multer upload builder for multiple fields.
 */
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

/**
 * Upload a single file buffer to Cloudinary as original (no transforms).
 */
const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string,
): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    try {
      const resource_type = getResourceTypeByMime(file.mimetype);

      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type,
          use_filename: true,
          unique_filename: true,
          overwrite: false,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result?.secure_url ?? '');
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
      // Run multer
      await new Promise<void>((resolve, reject) =>
        upload(fields)(req, res, err => (err ? reject(err) : resolve())),
      );

      const files = req.files as { [field: string]: Express.Multer.File[] };

      for (const field of Object.keys(fields)) {
        if (files?.[field]?.length) {
          const targetFolder =
            fileValidators[fields[field].fileType]?.folder ??
            getFolderByMime(files[field][0].mimetype); // fallback only

          const uploadedFiles = await Promise.all(
            files[field].map(file => uploadToCloudinary(file, targetFolder)),
          );

          req.body[field] =
            (fields[field]?.maxCount || 1) > 1
              ? uploadedFiles
              : uploadedFiles[0];
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

// // File validators
// // export const fileValidators = {
// //   images: { validator: /^(image|application\/octet-stream)/, folder: 'images' },
// //   videos: { validator: /^(video|application\/octet-stream)/, folder: 'videos' },
// //   thumbnails: { validator: /^image\//, folder: 'thumbnails' },
// //   audios: { validator: /^audio\//, folder: 'audios' },
// //   documents: { validator: /(pdf|word|excel|text)/, folder: 'docs' },
// //   any: { validator: /.*/, folder: 'others' },
// // };

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
//     size?: number; // in bytes
//     fileType: (typeof fileTypes)[number];
//   };
// }

// /**
//  * Get folder by MIME type
//  */

// const getResourceTypeByMime = (mime: string): CloudinaryResourceType => {
//   const m = mime.toLowerCase();
//   if (m.startsWith('image/')) return 'image';
//   if (m.startsWith('video/')) return 'video';
//   if (m.startsWith('audio/')) return 'raw';
//   // everything else (pdf, docs, zips, etc.)
//   return 'raw';
// };

// const getFolderByMime = (mime: string): string => {
//   const matched = Object.values(fileValidators).find(v =>
//     v.validator.test(mime.toLowerCase()),
//   );
//   return matched?.folder || 'others';
// };

// /**
//  * Multer memory storage (temporary before Cloudinary)
//  */
// const storage = multer.memoryStorage();

// /**
//  * File filter
//  */
// const fileFilter =
//   (fields: UploadFields) =>
//   (_: any, file: Express.Multer.File, cb: FileFilterCallback) => {
//     const fieldType = Object.keys(fields).find(f => file.fieldname === f);
//     const fileType = fields[fieldType!]?.fileType;
//     if (fileValidators[fileType]?.validator.test(file.mimetype))
//       return cb(null, true);

//     cb(
//       new AppError(
//         StatusCodes.BAD_REQUEST,
//         `${file.originalname} is not a valid ${fileType} file`,
//       ),
//     );
//   };

// /**
//  * Multer upload
//  */
// const upload = (fields: UploadFields) => {
//   const maxSize = Math.max(
//     ...Object.values(fields).map(f => f.size || 5 * 1024 * 1024),
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
//  * Upload file buffer to Cloudinary
//  */
// // const uploadToCloudinary = async (
// //   file: Express.Multer.File,
// //   folder: string,
// // ) => {
// //   return new Promise<string>((resolve, reject) => {
// //     try {
// //       const stream = cloudinary.uploader.upload_stream(
// //         { folder, resource_type: 'auto' },
// //         (error, result) => {
// //           if (error) return reject(error);
// //           resolve(result?.secure_url ?? '');
// //         },
// //       );
// //       streamifier.createReadStream(file.buffer).pipe(stream);
// //     } catch (error) {
// //       errorLogger.error(chalk.red('Cloudinary upload error:'), error);
// //     }
// //   });
// // };

// // REPLACE the whole uploadToCloudinary function with this
// const uploadToCloudinary = async (
//   file: Express.Multer.File,
//   folder: string,
// ) => {
//   return new Promise<string>((resolve, reject) => {
//     try {
//       const resource_type = getResourceTypeByMime(file.mimetype);

//       // IMPORTANT: no eager/quality/format here -> store original bytes
//       const stream = cloudinary.uploader.upload_stream(
//         {
//           folder,
//           resource_type,
//           use_filename: true, // keep client filename (without extension collisions)
//           unique_filename: true, // append a short hash to avoid overwrites
//           overwrite: false, // never overwrite
//           // Do NOT set quality/format/width/height here – we want originals.
//         },
//         (error, result) => {
//           if (error) return reject(error);
//           // result.secure_url points to the original asset (no transforms)
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

// /**
//  * Universal file uploader middleware (Cloudinary)
//  */
// const fileUploader = (fields: UploadFields) =>
//   catchAsync(async (req, res, next) => {
//     try {
//       await new Promise<void>((resolve, reject) =>
//         upload(fields)(req, res, err => (err ? reject(err) : resolve())),
//       );

//       const files = req.files as { [field: string]: Express.Multer.File[] };
//       for (const field of Object.keys(fields)) {
//         if (files?.[field]?.length) {
//           const uploadedFiles = await Promise.all(
//             files[field].map(file =>
//               uploadToCloudinary(file, getFolderByMime(file.mimetype)),
//             ),
//           );

//           // console.log('uploadedFiles:', files);

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
