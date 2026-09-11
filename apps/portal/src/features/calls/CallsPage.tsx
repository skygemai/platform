import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { CallAgentOption, CallDetail, CallsPage as CallsPageResponse } from "@skygem/shared";
import { CallDetailDialog } from "./CallDetailDialog";
import { getCall, listCallAgents, listCalls } from "./calls-api";
import "./calls.css";

const PAGE_SIZE = 25;

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function initialDates(): { from: string; to: string } {
  const today = new Date();
  const prior = new Date(today);
  prior.setDate(prior.getDate() - 30);
  return { from: dateInputValue(prior), to: dateInputValue(today) };
}

function rangeToIso(from: string, to: string): { from: string; to: string } {
  const start = new Date(`${from}T00:00:00`);
  const endExclusive = new Date(`${to}T00:00:00`);
  endExclusive.setDate(endExclusive.getDate() + 1);
  return { from: start.toISOString(), to: endExclusive.toISOString() };
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

export function CallsPage() {
  const defaults = useMemo(initialDates, []);
  const [fromDate, setFromDate] = useState(defaults.from);
  const [toDate, setToDate] = useState(defaults.to);
  const [agentId, setAgentId] = useState("");
  const [applied, setApplied] = useState({ ...defaults, agentId: "" });
  const [offset, setOffset] = useState(0);
  const [agents, setAgents] = useState<CallAgentOption[]>([]);
  const [data, setData] = useState<CallsPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<CallDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const iso = rangeToIso(applied.from, applied.to);
      const filters = {
        ...iso,
        limit: PAGE_SIZE,
        offset,
        ...(applied.agentId ? { agentId: applied.agentId } : {})
      };
      const [loadedCalls, loadedAgents] = await Promise.all([
        listCalls(filters),
        listCallAgents()
      ]);
      setData(loadedCalls);
      setAgents(loadedAgents);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load calls");
    } finally {
      setLoading(false);
    }
  }, [applied, offset]);

  useEffect(() => { void load(); }, [load]);

  function applyFilters(event: FormEvent) {
    event.preventDefault();
    if (!fromDate || !toDate || fromDate > toDate) {
      setError("Choose a valid date range.");
      return;
    }
    setOffset(0);
    setApplied({ from: fromDate, to: toDate, agentId });
  }

  async function openDetail(callId: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setSelectedCall(null);
    try {
      setSelectedCall(await getCall(callId));
    } catch (reason) {
      setDetailError(reason instanceof Error ? reason.message : "Unable to load call detail");
    } finally {
      setDetailLoading(false);
    }
  }

  const first = data && data.total ? data.offset + 1 : 0;
  const last = data ? Math.min(data.offset + data.items.length, data.total) : 0;

  return (
    <section className="management-page calls-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Client portal</p>
          <h2>Calls</h2>
          <p className="page-copy">Review call activity for the selected tenant.</p>
        </div>
      </div>

      <form className="call-filters" onSubmit={applyFilters}>
        <label>Agent
          <select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
            <option value="">All agents</option>
            {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.displayName}</option>)}
          </select>
        </label>
        <label>From
          <input type="date" value={fromDate} max={toDate} onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label>Through
          <input type="date" value={toDate} min={fromDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
        <button className="button primary" type="submit" disabled={loading}>Apply</button>
      </form>

      <div className="management-panel">
        {error ? (
          <div className="empty-state error-state"><h3>Couldn’t load calls</h3><p>{error}</p><button className="button secondary" onClick={() => void load()}>Try again</button></div>
        ) : loading && !data ? (
          <div className="empty-state"><h3>Loading calls…</h3></div>
        ) : !data || data.items.length === 0 ? (
          <div className="empty-state"><h3>No calls in this range</h3><p>Try a wider date range or select all agents.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Started</th><th>Agent</th><th>Direction</th><th>Status</th><th>Duration</th><th>Sentiment</th><th>Outcome</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>{data.items.map((call) => (
                <tr key={call.id}>
                  <td>{new Date(call.startedAt).toLocaleString()}</td>
                  <td>{call.agentName ?? "Unknown agent"}</td>
                  <td className="capitalize">{call.direction}</td>
                  <td><span className="capitalize">{call.status}</span></td>
                  <td>{formatDuration(call.durationSeconds)}</td>
                  <td>{call.sentiment ?? "—"}</td>
                  <td>{call.callSuccessful == null ? "—" : call.callSuccessful ? "Successful" : "Unsuccessful"}</td>
                  <td><button className="text-button" onClick={() => void openDetail(call.id)}>View</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {data && data.total > 0 && (
          <footer className="call-pagination">
            <span>{first}–{last} of {data.total}</span>
            <div>
              <button className="button secondary compact" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</button>
              <button className="button secondary compact" disabled={offset + PAGE_SIZE >= data.total || loading} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</button>
            </div>
          </footer>
        )}
      </div>

      {detailOpen && <CallDetailDialog call={selectedCall} loading={detailLoading} error={detailError} onClose={() => setDetailOpen(false)} />}
    </section>
  );
}
