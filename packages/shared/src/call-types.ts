export type CallDirection = "inbound" | "outbound";

export interface CallRecord {
  id: string;
  externalCallId: string;
  tenantId: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  direction: CallDirection;
  fromNumber: string | null;
  toNumber: string | null;
  durationSeconds: number | null;
  summary: string | null;
}

export interface CallsPage {
  items: CallRecord[];
  limit: number;
  offset: number;
}

export interface AnalyticsSummary {
  totalCalls: number;
  completedCalls: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number;
}
