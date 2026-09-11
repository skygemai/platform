import { useEffect } from "react";
import type { CallDetail } from "@skygem/shared";

interface Props {
  call: CallDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

export function CallDetailDialog({ call, loading, error, onClose }: Props) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="call-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="call-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">Call detail</p>
            <h2 id="call-detail-title">{call?.agentName ?? "Call"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">×</button>
        </header>

        {loading ? <p>Loading call…</p> : error ? <p className="notice">{error}</p> : call ? (
          <div className="call-detail-content">
            <dl className="call-facts">
              <div><dt>Started</dt><dd>{new Date(call.startedAt).toLocaleString()}</dd></div>
              <div><dt>Duration</dt><dd>{formatDuration(call.durationSeconds)}</dd></div>
              <div><dt>Direction</dt><dd className="capitalize">{call.direction}</dd></div>
              <div><dt>Status</dt><dd className="capitalize">{call.status}</dd></div>
              <div><dt>Sentiment</dt><dd>{call.sentiment ?? "—"}</dd></div>
              <div><dt>Outcome</dt><dd>{call.callSuccessful == null ? "—" : call.callSuccessful ? "Successful" : "Unsuccessful"}</dd></div>
              {call.permissions.canViewPhoneNumbers && <>
                <div><dt>From</dt><dd>{call.fromNumber ?? "—"}</dd></div>
                <div><dt>To</dt><dd>{call.toNumber ?? "—"}</dd></div>
              </>}
            </dl>

            <section className="call-text-section">
              <h3>Summary</h3>
              {call.permissions.canViewSummary
                ? <p>{call.summary ?? "No summary is available."}</p>
                : <p className="muted">Your role does not include summary access.</p>}
            </section>

            <section className="call-text-section">
              <h3>Transcript</h3>
              {call.permissions.canViewTranscript
                ? <pre>{call.transcript ?? "No transcript is available."}</pre>
                : <p className="muted">Your role does not include transcript access.</p>}
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}
