import type { CreateAppointmentRequest } from "./appointments.schemas.js";

export interface CalendarProvider {
  createAppointment(input: CreateAppointmentRequest & { tenantId: string }): Promise<{
    providerAppointmentId: string;
    status: "confirmed" | "pending";
  }>;
}

/**
 * This service is not wired to a public route until a calendar provider and
 * tenant-specific availability rules are selected.
 */
export class AppointmentsService {
  constructor(private readonly provider: CalendarProvider) {}

  create(tenantId: string, input: CreateAppointmentRequest) {
    return this.provider.createAppointment({ ...input, tenantId });
  }
}
