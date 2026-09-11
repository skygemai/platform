import { z } from "zod";

export const listCallsQuerySchema = z.object({
  agentId: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0)
}).superRefine((value, context) => {
  if (Date.parse(value.from) >= Date.parse(value.to)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "from must be earlier than to" });
  }
});

export const callIdSchema = z.string().uuid();

export type ListCallsQuery = z.infer<typeof listCallsQuerySchema>;
