import { useEffect, useState, type FormEvent } from "react";
import type { Tenant } from "../tenants/tenants-api";
import type { InvitationRole, InviteUserInput } from "./invitations-api";

interface InviteUserDialogProps {
  open: boolean;
  tenants: Tenant[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onInvite: (input: InviteUserInput) => Promise<void>;
}

export function InviteUserDialog({
  open,
  tenants,
  saving,
  error,
  onClose,
  onInvite
}: InviteUserDialogProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [role, setRole] = useState<InvitationRole>("viewer");

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setDisplayName("");
    setTenantId(tenants[0]?.id ?? "");
    setRole("viewer");
  }, [open, tenants]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!tenantId) return;
    await onInvite({
      email: email.trim(),
      displayName: displayName.trim() || null,
      tenantId,
      role
    });
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}
    >
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="invite-dialog-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">New portal access</p>
            <h2 id="invite-dialog-title">Invite user</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label="Close">×</button>
        </div>

        <form className="tenant-form" onSubmit={submit}>
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              required
              maxLength={320}
              autoFocus
            />
          </label>

          <label>
            Display name <span className="optional">Optional</span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Full name"
              maxLength={120}
            />
          </label>

          <label>
            Tenant
            <select value={tenantId} onChange={(event) => setTenantId(event.target.value)} required>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
          </label>

          <label>
            Role
            <select value={role} onChange={(event) => setRole(event.target.value as InvitationRole)}>
              <option value="viewer">Viewer</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
          </label>

          <p className="dialog-help">
            New users receive a Cognito email with temporary sign-in credentials. Existing users are granted access to the selected tenant.
          </p>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="modal-actions">
            <button className="button secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="button primary" type="submit" disabled={saving || !tenantId}>
              {saving ? "Sending…" : "Send invitation"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
