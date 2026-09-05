import { useEffect, useState, type FormEvent } from "react";
import type { Tenant, TenantInput } from "./tenants-api";

interface TenantDialogProps {
  tenant: Tenant | null;
  open: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: TenantInput) => Promise<void>;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function TenantDialog({
  tenant,
  open,
  saving,
  error,
  onClose,
  onSave
}: TenantDialogProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(tenant?.name ?? "");
    setSlug(tenant?.slug ?? "");
    setIsActive(tenant?.isActive ?? true);
    setSlugEdited(Boolean(tenant));
  }, [open, tenant]);

  if (!open) return null;

  function changeName(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({ name: name.trim(), slug: slug.trim(), isActive });
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}
    >
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="tenant-dialog-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">{tenant ? "Edit account" : "New account"}</p>
            <h2 id="tenant-dialog-title">{tenant ? "Edit tenant" : "Add tenant"}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} disabled={saving} aria-label="Close">×</button>
        </div>

        <form className="tenant-form" onSubmit={submit}>
          <label>
            Tenant name
            <input value={name} onChange={(event) => changeName(event.target.value)} required maxLength={160} autoFocus />
          </label>

          <label>
            Slug
            <input
              value={slug}
              onChange={(event) => {
                setSlugEdited(true);
                setSlug(event.target.value.toLowerCase());
              }}
              pattern="[a-z0-9]+(?:_[a-z0-9]+)*"
              placeholder="acme_health"
              required
              maxLength={80}
            />
            <small>Lowercase letters, numbers, and underscores.</small>
          </label>

          <label className="toggle-row">
            <span><strong>Active tenant</strong><small>Inactive tenants remain in the database.</small></span>
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="modal-actions">
            <button className="button secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="button primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : tenant ? "Save changes" : "Add tenant"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
