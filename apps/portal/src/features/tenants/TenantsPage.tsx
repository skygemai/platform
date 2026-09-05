import { useCallback, useEffect, useMemo, useState } from "react";
import { TenantDialog } from "./TenantDialog";
import {
  createTenant,
  deleteTenant,
  listTenants,
  updateTenant,
  type Tenant,
  type TenantInput
} from "./tenants-api";

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setTenants(await listTenants());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load tenants.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleTenants = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return tenants;
    return tenants.filter((tenant) =>
      tenant.name.toLowerCase().includes(value) || tenant.slug.includes(value)
    );
  }, [query, tenants]);

  function openCreate() {
    setEditingTenant(null);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(tenant: Tenant) {
    setEditingTenant(tenant);
    setFormError(null);
    setDialogOpen(true);
  }

  async function save(input: TenantInput) {
    setSaving(true);
    setFormError(null);
    try {
      const saved = editingTenant
        ? await updateTenant(editingTenant.id, input)
        : await createTenant(input);

      setTenants((current) => {
        const next = editingTenant
          ? current.map((tenant) => tenant.id === saved.id ? saved : tenant)
          : [...current, saved];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      setDialogOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save the tenant.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(tenant: Tenant) {
    const confirmed = window.confirm(
      `Permanently delete ${tenant.name}? This is allowed only when it has no related records. Deactivate it instead if the account may be needed later.`
    );
    if (!confirmed) return;

    setDeletingId(tenant.id);
    try {
      await deleteTenant(tenant.id);
      setTenants((current) => current.filter((item) => item.id !== tenant.id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to delete the tenant.");
    } finally {
      setDeletingId(null);
    }
  }

  const activeCount = tenants.filter((tenant) => tenant.isActive).length;

  return (
    <section className="management-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Control plane</p>
          <h2>Tenants</h2>
          <p className="page-copy">Manage customer accounts and their active status.</p>
        </div>
        <button className="button primary" onClick={openCreate}>+ Add tenant</button>
      </div>

      <div className="summary-cards">
        <article><span>Total tenants</span><strong>{tenants.length}</strong></article>
        <article><span>Active tenants</span><strong>{activeCount}</strong></article>
      </div>

      <div className="management-panel">
        <div className="management-toolbar">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tenants"
            aria-label="Search tenants"
          />
          <button className="button secondary compact" onClick={() => void load()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {loading && tenants.length === 0 ? (
          <div className="empty-state"><h3>Loading tenants…</h3></div>
        ) : loadError ? (
          <div className="empty-state error-state"><h3>Couldn’t load tenants</h3><p>{loadError}</p><button className="button secondary" onClick={() => void load()}>Try again</button></div>
        ) : visibleTenants.length === 0 ? (
          <div className="empty-state"><h3>{query ? "No matching tenants" : "No tenants yet"}</h3><p>{query ? "Try a different name or slug." : "Add the first customer account."}</p>{!query && <button className="button primary" onClick={openCreate}>+ Add tenant</button>}</div>
        ) : (
          <div className="table-wrap tenant-table">
            <table>
              <thead><tr><th>Tenant</th><th>Slug</th><th>Status</th><th>Created</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                {visibleTenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td><strong>{tenant.name}</strong></td>
                    <td><code>{tenant.slug}</code></td>
                    <td><span className={`status-pill ${tenant.isActive ? "active" : "inactive"}`}>{tenant.isActive ? "Active" : "Inactive"}</span></td>
                    <td>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(tenant.createdAt))}</td>
                    <td><div className="table-actions"><button className="text-button" onClick={() => openEdit(tenant)}>Edit</button><button className="text-button danger" onClick={() => void remove(tenant)} disabled={deletingId === tenant.id}>{deletingId === tenant.id ? "Deleting…" : "Delete"}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TenantDialog tenant={editingTenant} open={dialogOpen} saving={saving} error={formError} onClose={() => !saving && setDialogOpen(false)} onSave={save} />
    </section>
  );
}
