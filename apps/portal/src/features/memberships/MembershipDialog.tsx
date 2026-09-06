import { useEffect, useState, type FormEvent } from "react";
import type { Tenant } from "../tenants/tenants-api";
import type { User } from "../users/users-api";
import {
  membershipRoles,
  type Membership,
  type MembershipInput,
  type MembershipRole
} from "./memberships-api";

interface MembershipDialogProps {
  membership: Membership | null;
  users: User[];
  tenants: Tenant[];
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: MembershipInput) => Promise<void>;
}

function roleLabel(role: MembershipRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function MembershipDialog({
  membership,
  users,
  tenants,
  open,
  saving,
  error,
  onClose,
  onSave
}: MembershipDialogProps) {
  const [userId, setUserId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [role, setRole] = useState<MembershipRole>("member");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setUserId(membership?.userId ?? users[0]?.id ?? "");
    setTenantId(membership?.tenantId ?? tenants[0]?.id ?? "");
    setRole(membership?.role ?? "member");
    setIsActive(membership?.isActive ?? true);
  }, [open, membership, users, tenants]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({ userId, tenantId, role, isActive });
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}
    >
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="membership-dialog-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{membership ? "Edit access" : "Grant access"}</p>
            <h2 id="membership-dialog-title">
              {membership ? "Edit membership" : "Add membership"}
            </h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label="Close">×</button>
        </div>

        <form className="tenant-form membership-form" onSubmit={submit}>
          <label>
            User
            <select value={userId} onChange={(event) => setUserId(event.target.value)} required autoFocus>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.displayName ? `${user.displayName} — ${user.email}` : user.email}
                  {!user.isActive ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tenant
            <select value={tenantId} onChange={(event) => setTenantId(event.target.value)} required>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.slug}){!tenant.isActive ? " — inactive" : ""}
                </option>
              ))}
            </select>
          </label>

          <label>
            Role
            <select value={role} onChange={(event) => setRole(event.target.value as MembershipRole)} required>
              {membershipRoles.map((value) => (
                <option key={value} value={value}>{roleLabel(value)}</option>
              ))}
            </select>
            <small>The role applies only within the selected tenant.</small>
          </label>

          <label className="toggle-row">
            <span><strong>Active membership</strong><small>Inactive memberships keep their history without granting access.</small></span>
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="modal-actions">
            <button className="button secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="button primary" type="submit" disabled={saving || !userId || !tenantId}>
              {saving ? "Saving…" : membership ? "Save changes" : "Add membership"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
