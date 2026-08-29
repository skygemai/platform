import { useEffect, useState } from "react";
import type { CallsPage as CallsPageResponse } from "@skygem/shared";
import { apiGet } from "../../api/client";

export function CallsPage() {
  const [data, setData] = useState<CallsPageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<CallsPageResponse>("/v1/portal/calls?limit=25&offset=0")
      .then(setData)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Unable to load calls");
      });
  }, []);

  if (error) return <p className="notice">{error}</p>;
  if (!data) return <p>Loading calls…</p>;

  return (
    <section>
      <h2>Recent calls</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Started</th><th>Direction</th><th>Status</th><th>Duration</th><th>Summary</th></tr>
          </thead>
          <tbody>
            {data.items.map((call) => (
              <tr key={call.id}>
                <td>{new Date(call.startedAt).toLocaleString()}</td>
                <td>{call.direction}</td>
                <td>{call.status}</td>
                <td>{call.durationSeconds == null ? "—" : `${call.durationSeconds}s`}</td>
                <td>{call.summary ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
