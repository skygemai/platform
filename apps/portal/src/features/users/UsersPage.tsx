import { useCallback, useEffect, useMemo, useState } from "react";
import { listTenants, type Tenant } from "../tenants/tenants-api";
import { InviteUserDialog } from "./InviteUserDialog";
import { inviteUser, type InviteUserInput } from "./invitations-api";
import { UserDialog } from "./UserDialog";
import {
  deleteUser,
  listUsers,
  updateUser,
  type User,
  type UserInput
} from "./users-api";
import "./invitations.css";

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [loadedUsers, loadedTenants] = await Promise.all([listUsers(), listTenants()]);
      setUsers(loadedUsers);
      setTenants(loadedTenants);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleUsers = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return users;
    return users.filter((user) =>
      user.email.toLowerCase().includes(value) ||
      user.displayName?.toLowerCase().includes(value)
    );
  }, [query, users]);

  function openInvite() {
    setFormError(null);
    setSuccessMessage(null);
    setInviteOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setFormError(null);
    setSuccessMessage(null);
  }

  async function sendInvitation(input: InviteUserInput) {
    setSaving(true);
    setFormError(null);
    try {
      const result = await inviteUser(input);
      setUsers((current) => {
        const exists = current.some((user) => user.id === result.user.id);
        const next = exists
          ? current.map((user) => user.id === result.user.id ? result.user : user)
          : [...current, result.user];
        return next.sort((left, right) => left.email.localeCompare(right.email));
      });
      setInviteOpen(false);
      setSuccessMessage(
        result.emailSent
          ? `Invitation sent to ${result.user.email}.`
          : `${result.user.email} already has a Cognito account; tenant access was added.`
      );
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to send the invitation.");
    } finally {
      setSaving(false);
    }
  }

  async function saveUser(input: UserInput) {
    if (!editingUser) return;
    setSaving(true);
    setFormError(null);
    try {
      const saved = await updateUser(editingUser.id, input);
      setUsers((current) => current.map((user) => user.id === saved.id ? saved : user));
      setEditingUser(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save the user.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(user: User) {
    if (!window.confirm(`Permanently delete ${user.displayName || user.email}?`)) return;
    setDeletingId(user.id);
    try {
      await deleteUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to delete the user.");
    } finally {
      setDeletingId(null);
    }
  }

  const activeCount = users.filter((user) => user.isActive).length;
  const canInvite = tenants.length > 0;

  return (
    <section className="management-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Control plane</p>
          <h2>Users</h2>
          <p className="page-copy">Invite people and manage access to SkyGem services.</p>
        </div>
        <button className="button primary" onClick={openInvite} disabled={!canInvite}>
          + Invite user
        </button>
      </div>

      <div className="summary-cards">
        <article><span>Total users</span><strong>{users.length}</strong></article>
        <article><span>Active users</span><strong>{activeCount}</strong></article>
      </div>

      {successMessage && <p className="notice" role="status">{successMessage}</p>}
      {!loading && !canInvite && <p className="notice">Create a tenant before inviting a user.</p>}

      <div className="management-panel">
        <div className="management-toolbar">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or email"
            aria-label="Search users"
          />
          <button className="button secondary compact" onClick={() => void load()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {loading && users.length === 0 ? (
          <div className="empty-state"><h3>Loading users…</h3></div>
        ) : loadError ? (
          <div className="empty-state error-state">
            <h3>Couldn’t load users</h3>
            <p>{loadError}</p>
            <button className="button secondary" onClick={() => void load()}>Try again</button>
          </div>
        ) : visibleUsers.length === 0 ? (
          <div className="empty-state">
            <h3>{query ? "No matching users" : "No users yet"}</h3>
            <p>{query ? "Try a different name or email." : "Invite the first user."}</p>
            {!query && canInvite && <button className="button primary" onClick={openInvite}>+ Invite user</button>}
          </div>
        ) : (
          <div className="table-wrap management-table">
            <table>
              <thead>
                <tr>
                  <th>User</th><th>Status</th><th>Created</th><th><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="person-cell">
                        <span className="avatar">{(user.displayName || user.email).charAt(0).toUpperCase()}</span>
                        <span><strong>{user.displayName || "Unnamed user"}</strong><small>{user.email}</small></span>
                      </div>
                    </td>
                    <td><span className={`status-pill ${user.isActive ? "active" : "inactive"}`}>{user.isActive ? "Active" : "Inactive"}</span></td>
                    <td>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(user.createdAt))}</td>
                    <td>
                      <div className="table-actions">
                        <button className="text-button" onClick={() => openEdit(user)}>Edit</button>
                        <button className="text-button danger" onClick={() => void remove(user)} disabled={deletingId === user.id}>
                          {deletingId === user.id ? "Deleting…" : "Delete"}
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

      <InviteUserDialog
        open={inviteOpen}
        tenants={tenants}
        saving={saving}
        error={formError}
        onClose={() => !saving && setInviteOpen(false)}
        onInvite={sendInvitation}
      />

      <UserDialog
        user={editingUser}
        open={editingUser !== null}
        saving={saving}
        error={formError}
        onClose={() => !saving && setEditingUser(null)}
        onSave={saveUser}
      />
    </section>
  );
}
