export type CallDirection = "inbound" | "outbound";

// Kept for compatibility with code outside the call explorer. New list endpoints
// use CallListItem so sensitive detail fields cannot accidentally enter tables.
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

export interface CallAgentOption {
  id: string;
  displayName: string;
}

export interface CallListItem {
  id: string;
  externalCallId: string;
  agentId: string | null;
  agentName: string | null;
  startedAt: string;
  endedAt: string | null;
  status: string;
  direction: CallDirection;
  durationSeconds: number | null;
  sentiment: string | null;
  callSuccessful: boolean | null;
}

export interface CallsPage {
  items: CallListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface CallDetail extends CallListItem {
  fromNumber: string | null;
  toNumber: string | null;
  disconnectionReason: string | null;
  summary: string | null;
  transcript: string | null;
  permissions: {
    canViewSummary: boolean;
    canViewTranscript: boolean;
    canViewPhoneNumbers: boolean;
  };
}

export interface AnalyticsSummary {
  totalCalls: number;
  completedCalls: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number;
}
