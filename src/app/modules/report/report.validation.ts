import { z } from 'zod';

export const reportValidation = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    content: z.string().optional(),
  }),
});
