const selectedTenantKey = "skygem.selectedTenantId";

export function getSelectedTenantId(): string | null {
  return window.localStorage.getItem(selectedTenantKey);
}

export function storeSelectedTenantId(tenantId: string | null): void {
  if (tenantId) window.localStorage.setItem(selectedTenantKey, tenantId);
  else window.localStorage.removeItem(selectedTenantKey);
}
