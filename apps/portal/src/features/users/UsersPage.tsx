import { useCallback, useEffect, useMemo, useState } from "react";
import { UserDialog } from "./UserDialog";
import { createUser, deleteUser, listUsers, updateUser, type User, type UserInput } from "./users-api";

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try { setUsers(await listUsers()); }
    catch (error) { setLoadError(error instanceof Error ? error.message : "Unable to load users."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleUsers = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return users;
    return users.filter((user) => user.email.toLowerCase().includes(value) || user.displayName?.toLowerCase().includes(value));
  }, [query, users]);

  function openCreate() { setEditingUser(null); setFormError(null); setDialogOpen(true); }
  function openEdit(user: User) { setEditingUser(user); setFormError(null); setDialogOpen(true); }

  async function save(input: UserInput) {
    setSaving(true);
    setFormError(null);
    try {
      const saved = editingUser ? await updateUser(editingUser.id, input) : await createUser(input);
      setUsers((current) => {
        const next = editingUser ? current.map((user) => user.id === saved.id ? saved : user) : [...current, saved];
        return next.sort((a, b) => a.email.localeCompare(b.email));
      });
      setDialogOpen(false);
    } catch (error) { setFormError(error instanceof Error ? error.message : "Unable to save the user."); }
    finally { setSaving(false); }
  }

  async function remove(user: User) {
    if (!window.confirm(`Permanently delete ${user.displayName || user.email}?`)) return;
    setDeletingId(user.id);
    try { await deleteUser(user.id); setUsers((current) => current.filter((item) => item.id !== user.id)); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Unable to delete the user."); }
    finally { setDeletingId(null); }
  }

  const activeCount = users.filter((user) => user.isActive).length;

  return (
    <section className="management-page">
      <div className="page-title-row"><div><p className="eyebrow">Control plane</p><h2>Users</h2><p className="page-copy">Manage people who can access SkyGem services.</p></div><button className="button primary" onClick={openCreate}>+ Add user</button></div>
      <div className="summary-cards"><article><span>Total users</span><strong>{users.length}</strong></article><article><span>Active users</span><strong>{activeCount}</strong></article></div>
      <div className="management-panel">
        <div className="management-toolbar"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" aria-label="Search users" /><button className="button secondary compact" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</button></div>
        {loading && users.length === 0 ? <div className="empty-state"><h3>Loading users…</h3></div> : loadError ? <div className="empty-state error-state"><h3>Couldn’t load users</h3><p>{loadError}</p><button className="button secondary" onClick={() => void load()}>Try again</button></div> : visibleUsers.length === 0 ? <div className="empty-state"><h3>{query ? "No matching users" : "No users yet"}</h3><p>{query ? "Try a different name or email." : "Add the first user."}</p>{!query && <button className="button primary" onClick={openCreate}>+ Add user</button>}</div> : (
          <div className="table-wrap management-table"><table><thead><tr><th>User</th><th>Status</th><th>Created</th><th><span className="visually-hidden">Actions</span></th></tr></thead><tbody>{visibleUsers.map((user) => <tr key={user.id}><td><div className="person-cell"><span className="avatar">{(user.displayName || user.email).charAt(0).toUpperCase()}</span><span><strong>{user.displayName || "Unnamed user"}</strong><small>{user.email}</small></span></div></td><td><span className={`status-pill ${user.isActive ? "active" : "inactive"}`}>{user.isActive ? "Active" : "Inactive"}</span></td><td>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(user.createdAt))}</td><td><div className="table-actions"><button className="text-button" onClick={() => openEdit(user)}>Edit</button><button className="text-button danger" onClick={() => void remove(user)} disabled={deletingId === user.id}>{deletingId === user.id ? "Deleting…" : "Delete"}</button></div></td></tr>)}</tbody></table></div>
        )}
      </div>
      <UserDialog user={editingUser} open={dialogOpen} saving={saving} error={formError} onClose={() => !saving && setDialogOpen(false)} onSave={save} />
    </section>
  );
}
