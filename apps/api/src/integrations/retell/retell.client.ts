export interface RetellCallResponse {
  call_id: string;
  call_status: string;
  start_timestamp?: number;
  end_timestamp?: number;
}

export class RetellClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = "https://api.retellai.com"
  ) {}

  async getCall(callId: string): Promise<RetellCallResponse> {
    const response = await fetch(`${this.baseUrl}/v2/get-call/${encodeURIComponent(callId)}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` }
    });
    if (!response.ok) {
      throw new Error(`Retell returned HTTP ${response.status}`);
    }
    return response.json() as Promise<RetellCallResponse>;
  }
}
