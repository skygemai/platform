import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { ActionKeyDialog } from "./ActionKeyDialog";
import { AgentDialog } from "./AgentDialog";
import {
  createAgentConfiguration,
  listAgentConfigurations,
  rotateAgentActionKey,
  updateAgentConfiguration,
  type AgentConfiguration,
  type AgentConfigurationInput
} from "./agents-api";
import "./agents.css";

export function AgentsPage() {
  const { selectedTenantId, tenants } = useAuth();
  const [agents, setAgents] = useState<AgentConfiguration[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentConfiguration | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);

  const selectedTenant = tenants.find((tenant) => tenant.id === selectedTenantId);

  const load = useCallback(async () => {
    if (!selectedTenantId) {
      setAgents([]);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      setAgents(await listAgentConfigurations(selectedTenantId));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load agents.");
    } finally {
      setLoading(false);
    }
  }, [selectedTenantId]);

  useEffect(() => { void load(); }, [load]);

  const visibleAgents = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return agents;
    return agents.filter((agent) =>
      agent.displayName.toLowerCase().includes(value) ||
      agent.retellAgentId.toLowerCase().includes(value)
    );
  }, [agents, query]);

  function openCreate() {
    setEditingAgent(null);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(agent: AgentConfiguration) {
    setEditingAgent(agent);
    setFormError(null);
    setDialogOpen(true);
  }

  async function save(input: AgentConfigurationInput) {
    setSaving(true);
    setFormError(null);
    try {
      if (editingAgent) {
        const updated = await updateAgentConfiguration(editingAgent.id, input);
        setAgents((current) => current.map((agent) => agent.id === updated.id ? updated : agent));
      } else {
        const created = await createAgentConfiguration(input);
        setAgents((current) => [...current, created.agentConfiguration].sort((a, b) => a.displayName.localeCompare(b.displayName)));
        setActionKey(created.actionKey);
      }
      setDialogOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save the agent.");
    } finally {
      setSaving(false);
    }
  }

  async function rotate(agent: AgentConfiguration) {
    if (!selectedTenantId) return;
    if (!window.confirm(`Rotate the action key for ${agent.displayName}? The current key will stop working immediately.`)) return;
    setRotatingId(agent.id);
    try {
      setActionKey(await rotateAgentActionKey(agent.id, selectedTenantId));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to rotate the action key.");
    } finally {
      setRotatingId(null);
    }
  }

  const activeCount = agents.filter((agent) => agent.active).length;

  return (
    <section className="management-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Control plane</p>
          <h2>Agents</h2>
          <p className="page-copy">Manage Retell agents for {selectedTenant?.name ?? "the selected tenant"}.</p>
        </div>
        <button className="button primary" onClick={openCreate} disabled={!selectedTenantId}>+ Add agent</button>
      </div>

      <div className="summary-cards">
        <article><span>Total agents</span><strong>{agents.length}</strong></article>
        <article><span>Active agents</span><strong>{activeCount}</strong></article>
      </div>

      <div className="management-panel">
        <div className="management-toolbar">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or Retell ID" aria-label="Search agents" />
          <button className="button secondary compact" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button>
        </div>

        {loadError ? (
          <div className="empty-state error-state"><h3>Couldn’t load agents</h3><p>{loadError}</p><button className="button secondary" onClick={() => void load()}>Try again</button></div>
        ) : loading && agents.length === 0 ? (
          <div className="empty-state"><h3>Loading agents…</h3></div>
        ) : visibleAgents.length === 0 ? (
          <div className="empty-state"><h3>{query ? "No matching agents" : "No agents configured"}</h3><p>Add the first Retell agent for this tenant.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Agent</th><th>Retell agent ID</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>{visibleAgents.map((agent) => (
                <tr key={agent.id}>
                  <td><strong>{agent.displayName}</strong></td>
                  <td><code>{agent.retellAgentId}</code></td>
                  <td><span className={`status-pill ${agent.active ? "active" : "inactive"}`}>{agent.active ? "Active" : "Inactive"}</span></td>
                  <td><div className="table-actions">
                    <button className="text-button" onClick={() => openEdit(agent)}>Edit</button>
                    <button className="text-button" onClick={() => void rotate(agent)} disabled={rotatingId === agent.id}>{rotatingId === agent.id ? "Rotating…" : "Rotate key"}</button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTenantId && <AgentDialog agent={editingAgent} tenantId={selectedTenantId} open={dialogOpen} saving={saving} error={formError} onClose={() => !saving && setDialogOpen(false)} onSave={save} />}
      {actionKey && <ActionKeyDialog actionKey={actionKey} onClose={() => setActionKey(null)} />}
    </section>
  );
}
