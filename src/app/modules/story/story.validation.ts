import { z } from 'zod';

const createStoryValidationSchema = z.object({
  body: z.object({
    content: z.string({ required_error: 'Content is required' }),
    author: z.string({ required_error: 'Author is required' }),
  }),
});

export const StoryValidation = {
  createStoryValidationSchema,
};
