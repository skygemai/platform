import { useCallback, useEffect, useMemo, useState } from "react";
import { listTenants, type Tenant } from "../tenants/tenants-api";
import { listUsers, type User } from "../users/users-api";
import { MembershipDialog } from "./MembershipDialog";
import {
  createMembership,
  deleteMembership,
  listMemberships,
  updateMembership,
  type Membership,
  type MembershipInput
} from "./memberships-api";
import "./memberships.css";

function membershipSort(left: Membership, right: Membership): number {
  return left.tenantName.localeCompare(right.tenantName) || left.userEmail.localeCompare(right.userEmail);
}

export function MembershipsPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [loadedMemberships, loadedUsers, loadedTenants] = await Promise.all([
        listMemberships(),
        listUsers(),
        listTenants()
      ]);
      setMemberships(loadedMemberships);
      setUsers(loadedUsers);
      setTenants(loadedTenants);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load memberships.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleMemberships = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return memberships;
    return memberships.filter((membership) =>
      membership.userEmail.toLowerCase().includes(value) ||
      membership.userDisplayName?.toLowerCase().includes(value) ||
      membership.tenantName.toLowerCase().includes(value) ||
      membership.tenantSlug.toLowerCase().includes(value) ||
      membership.role.includes(value)
    );
  }, [query, memberships]);

  function openCreate() {
    setEditingMembership(null);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(membership: Membership) {
    setEditingMembership(membership);
    setFormError(null);
    setDialogOpen(true);
  }

  async function save(input: MembershipInput) {
    setSaving(true);
    setFormError(null);
    try {
      const saved = editingMembership
        ? await updateMembership(editingMembership.id, input)
        : await createMembership(input);

      setMemberships((current) => {
        const next = editingMembership
          ? current.map((membership) => membership.id === saved.id ? saved : membership)
          : [...current, saved];
        return next.sort(membershipSort);
      });
      setDialogOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save the membership.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(membership: Membership) {
    const name = membership.userDisplayName || membership.userEmail;
    if (!window.confirm(`Remove ${name} from ${membership.tenantName}?`)) return;

    setDeletingId(membership.id);
    try {
      await deleteMembership(membership.id);
      setMemberships((current) => current.filter((item) => item.id !== membership.id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to delete the membership.");
    } finally {
      setDeletingId(null);
    }
  }

  const activeCount = memberships.filter((membership) => membership.isActive).length;
  const tenantCount = new Set(memberships.map((membership) => membership.tenantId)).size;
  const canCreate = users.length > 0 && tenants.length > 0;

  return (
    <section className="management-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Control plane</p>
          <h2>Memberships</h2>
          <p className="page-copy">Assign users to tenants and manage their tenant-specific roles.</p>
        </div>
        <button className="button primary" onClick={openCreate} disabled={!canCreate}>+ Add membership</button>
      </div>

      <div className="summary-cards membership-summary">
        <article><span>Total memberships</span><strong>{memberships.length}</strong></article>
        <article><span>Active memberships</span><strong>{activeCount}</strong></article>
        <article><span>Tenants represented</span><strong>{tenantCount}</strong></article>
      </div>

      {!loading && !canCreate && (
        <p className="notice">Create at least one user and one tenant before adding a membership.</p>
      )}

      <div className="management-panel">
        <div className="management-toolbar">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search user, tenant, or role"
            aria-label="Search memberships"
          />
          <button className="button secondary compact" onClick={() => void load()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {loading && memberships.length === 0 ? (
          <div className="empty-state"><h3>Loading memberships…</h3></div>
        ) : loadError ? (
          <div className="empty-state error-state">
            <h3>Couldn’t load memberships</h3>
            <p>{loadError}</p>
            <button className="button secondary" onClick={() => void load()}>Try again</button>
          </div>
        ) : visibleMemberships.length === 0 ? (
          <div className="empty-state">
            <h3>{query ? "No matching memberships" : "No memberships yet"}</h3>
            <p>{query ? "Try another user, tenant, or role." : "Assign a user to a tenant."}</p>
            {!query && canCreate && <button className="button primary" onClick={openCreate}>+ Add membership</button>}
          </div>
        ) : (
          <div className="table-wrap membership-table">
            <table>
              <thead><tr><th>User</th><th>Tenant</th><th>Role</th><th>Status</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
              <tbody>
                {visibleMemberships.map((membership) => (
                  <tr key={membership.id}>
                    <td>
                      <div className="person-cell">
                        <span className="avatar">{(membership.userDisplayName || membership.userEmail).charAt(0).toUpperCase()}</span>
                        <span><strong>{membership.userDisplayName || "Unnamed user"}</strong><small>{membership.userEmail}</small></span>
                      </div>
                    </td>
                    <td><strong>{membership.tenantName}</strong><br /><code>{membership.tenantSlug}</code></td>
                    <td><span className="role-pill">{membership.role}</span></td>
                    <td><span className={`status-pill ${membership.isActive ? "active" : "inactive"}`}>{membership.isActive ? "Active" : "Inactive"}</span></td>
                    <td>
                      <div className="table-actions">
                        <button className="text-button" onClick={() => openEdit(membership)}>Edit</button>
                        <button className="text-button danger" onClick={() => void remove(membership)} disabled={deletingId === membership.id}>
                          {deletingId === membership.id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MembershipDialog
        membership={editingMembership}
        users={users}
        tenants={tenants}
        open={dialogOpen}
        saving={saving}
        error={formError}
        onClose={() => !saving && setDialogOpen(false)}
        onSave={save}
      />
    </section>
  );
}
