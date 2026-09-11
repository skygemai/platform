import type { UserRole } from "@skygem/shared";
import { callPermissionsFor } from "./calls.permissions.js";
import type { CallsRepository } from "./calls.repository.js";
import type { ListCallsQuery } from "./calls.schemas.js";

export class CallsService {
  constructor(private readonly repository: CallsRepository) {}

  listAgents(tenantId: string) {
    return this.repository.listAgents(tenantId);
  }

  list(tenantId: string, query: ListCallsQuery) {
    return this.repository.list(tenantId, query);
  }

  get(tenantId: string, callId: string, role: UserRole) {
    return this.repository.find(tenantId, callId, callPermissionsFor(role));
  }
}
