import { z } from 'zod';

const createUserSchema = z.object({
  body: z.object({
    phone: z.string().optional(),
    password: z.string(),
    dob: z.date().optional(),
  }),
});

//* change some system
const updateUserProfileSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    dob: z.date().optional(),
    image: z.string().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHERS']).optional(),
  }),
});

const updateLocationZodSchema = z.object({
  body: z.object({
    longitude: z.string({ required_error: 'Longitude is required' }),
    latitude: z.string({ required_error: 'Latitude is required' }),
  }),
});

export const UserValidation = {
  createUserSchema,
  updateLocationZodSchema,
  updateUserProfileSchema,
};
