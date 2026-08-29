import type { CallsPage } from "@skygem/shared";
import type { CallsRepository } from "./calls.repository.js";

export class CallsService {
  constructor(private readonly repository: CallsRepository) {}

  async list(tenantId: string, limit: number, offset: number): Promise<CallsPage> {
    const items = await this.repository.listForTenant(tenantId, limit, offset);
    return { items, limit, offset };
  }

  async get(tenantId: string, callId: string) {
    return this.repository.findForTenant(tenantId, callId);
  }
}
