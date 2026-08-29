import type { AnalyticsRepository } from "./analytics.repository.js";

export class AnalyticsService {
  constructor(private readonly repository: AnalyticsRepository) {}

  summarize(tenantId: string) {
    return this.repository.summarizeForTenant(tenantId);
  }
}
