import { useEffect, useState } from "react";
import type { AnalyticsSummary } from "@skygem/shared";
import { apiGet } from "../../api/client";

export function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void apiGet<AnalyticsSummary>("/v1/portal/analytics")
      .then(setSummary)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Unable to load analytics");
      });
  }, []);

  if (error) return <p className="notice">{error}</p>;
  if (!summary) return <p>Loading analytics…</p>;

  return (
    <section>
      <h2>Call overview</h2>
      <div className="cards">
        <article><span>Total calls</span><strong>{summary.totalCalls}</strong></article>
        <article><span>Completed</span><strong>{summary.completedCalls}</strong></article>
        <article><span>Total minutes</span><strong>{Math.round(summary.totalDurationSeconds / 60)}</strong></article>
        <article><span>Average seconds</span><strong>{summary.averageDurationSeconds}</strong></article>
      </div>
    </section>
  );
}
