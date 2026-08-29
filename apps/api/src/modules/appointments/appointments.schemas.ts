import { z } from "zod";
import { e164PhoneNumberSchema } from "@skygem/shared";

export const createAppointmentRequestSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  durationMinutes: z.number().int().min(15).max(480),
  customerName: z.string().trim().min(1).max(200),
  customerEmail: z.string().email().optional(),
  customerPhone: e164PhoneNumberSchema.optional(),
  notes: z.string().trim().max(2000).optional(),
  idempotencyKey: z.string().uuid()
}).refine(
  (value) => value.customerEmail || value.customerPhone,
  { message: "An email address or phone number is required" }
);

export type CreateAppointmentRequest = z.infer<typeof createAppointmentRequestSchema>;
