import { z } from 'zod';

const createStoryValidationSchema = z.object({
  body: z
    .object({
      image: z.string().optional(),
      video: z.string().optional(),
    })
    .refine(data => data.image || data.video, {
      message: 'Either image or video must be provided',
    }),
});

export const StoryValidation = {
  createStoryValidationSchema,
};
