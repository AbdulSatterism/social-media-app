import { z } from 'zod';

const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().optional(),
    password: z.string(),
  }),
});

//TODO: need update more fields for this site

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
