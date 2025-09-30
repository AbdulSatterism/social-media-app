import { z } from 'zod';

export const reportValidation = z.object({
  body: z.object({
    name: z.string(),
    phone: z.string(),
    email: z.string(),
    content: z.string(),
  }),
});
