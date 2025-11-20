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
// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

// File validators
export const fileValidators = {
  images: { validator: /^(image|application\/octet-stream)/, folder: 'images' },
  videos: { validator: /^(video|application\/octet-stream)/, folder: 'videos' },
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
    size?: number; // in bytes
    fileType: (typeof fileTypes)[number];
  };
}

/**
 * Get folder by MIME type
 */
const getFolderByMime = (mime: string): string => {
  const matched = Object.values(fileValidators).find(v =>
    v.validator.test(mime.toLowerCase()),
  );
  return matched?.folder || 'others';
};

/**
 * Multer memory storage (temporary before Cloudinary)
 */
const storage = multer.memoryStorage();

/**
 * File filter
 */
const fileFilter =
  (fields: UploadFields) =>
  (_: any, file: Express.Multer.File, cb: FileFilterCallback) => {
    const fieldType = Object.keys(fields).find(f => file.fieldname === f);
    const fileType = fields[fieldType!]?.fileType;
    if (fileValidators[fileType]?.validator.test(file.mimetype))
      return cb(null, true);

    cb(
      new AppError(
        StatusCodes.BAD_REQUEST,
        `${file.originalname} is not a valid ${fileType} file`,
      ),
    );
  };

/**
 * Multer upload
 */
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

/**
 * Upload file buffer to Cloudinary
 */
const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string,
) => {
  return new Promise<string>((resolve, reject) => {
    try {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result?.secure_url ?? '');
        },
      );
      streamifier.createReadStream(file.buffer).pipe(stream);
    } catch (error) {
      errorLogger.error(chalk.red('Cloudinary upload error:'), error);
    }
  });
};

/**
 * Universal file uploader middleware (Cloudinary)
 */
const fileUploader = (fields: UploadFields) =>
  catchAsync(async (req, res, next) => {
    try {
      await new Promise<void>((resolve, reject) =>
        upload(fields)(req, res, err => (err ? reject(err) : resolve())),
      );

      const files = req.files as { [field: string]: Express.Multer.File[] };
      for (const field of Object.keys(fields)) {
        if (files?.[field]?.length) {
          const uploadedFiles = await Promise.all(
            files[field].map(file =>
              uploadToCloudinary(file, getFolderByMime(file.mimetype)),
            ),
          );

          // console.log('uploadedFiles:', files);

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
