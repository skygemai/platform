import { useEffect, useState, type FormEvent } from "react";
import type { User, UserInput } from "./users-api";

interface UserDialogProps {
  user: User | null;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: UserInput) => Promise<void>;
}

export function UserDialog({ user, open, saving, error, onClose, onSave }: UserDialogProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setEmail(user?.email ?? "");
    setDisplayName(user?.displayName ?? "");
    setIsActive(user?.isActive ?? true);
  }, [open, user]);

  if (!open) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({ email: email.trim(), displayName: displayName.trim() || null, isActive });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="user-dialog-title">
        <div className="modal-heading">
          <div><p className="eyebrow">{user ? "Edit record" : "New record"}</p><h2 id="user-dialog-title">{user ? "Edit user" : "Add user"}</h2></div>
          <button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label="Close">×</button>
        </div>
        <form className="tenant-form" onSubmit={submit}>
          <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.com" required maxLength={320} autoFocus /></label>
          <label>Display name <span className="optional">Optional</span><input type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Full name" maxLength={120} /></label>
          <label className="toggle-row"><span><strong>Active user</strong><small>Inactive users remain in the database.</small></span><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button className="button secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button><button className="button primary" type="submit" disabled={saving}>{saving ? "Saving…" : user ? "Save changes" : "Add user"}</button></div>
        </form>
      </section>
    </div>
  );
}
