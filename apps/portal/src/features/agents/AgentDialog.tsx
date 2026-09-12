import { useEffect, useState, type FormEvent } from "react";
import type { AgentConfiguration, AgentConfigurationInput } from "./agents-api";

interface Props {
  agent: AgentConfiguration | null;
  tenantId: string;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: AgentConfigurationInput) => Promise<void>;
}

export function AgentDialog({ agent, tenantId, open, saving, error, onClose, onSave }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [retellAgentId, setRetellAgentId] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setDisplayName(agent?.displayName ?? "");
    setRetellAgentId(agent?.retellAgentId ?? "");
    setActive(agent?.active ?? true);
  }, [agent, open]);

  if (!open) return null;

  function submit(event: FormEvent) {
    event.preventDefault();
    void onSave({
      tenantId,
      displayName: displayName.trim(),
      retellAgentId: retellAgentId.trim(),
      active
    });
  }

  return (
    <div className="agent-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="agent-dialog" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><p className="eyebrow">Agent configuration</p><h2>{agent ? "Edit agent" : "Add agent"}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">×</button>
        </header>

        <label>Display name
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={200} placeholder="Bright Smile Dental Receptionist" />
        </label>
        <label>Retell agent ID
          <input value={retellAgentId} onChange={(event) => setRetellAgentId(event.target.value)} required maxLength={255} placeholder="agent_..." autoCapitalize="none" autoCorrect="off" />
        </label>
        <label className="agent-checkbox"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /> Active</label>

        {error && <p className="notice">{error}</p>}
        <footer>
          <button className="button secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="button primary" type="submit" disabled={saving}>{saving ? "Saving…" : agent ? "Save changes" : "Add agent"}</button>
        </footer>
      </form>
    </div>
  );
}
