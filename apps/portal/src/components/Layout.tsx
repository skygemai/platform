import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Layout({ children }: { children: ReactNode }) {
  const auth = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-gem">S</span>SkyGem AI</div>
        <nav aria-label="Main navigation">
          <div className="nav-section">Client portal</div>
          <NavLink to="/">Calls</NavLink>
          <NavLink to="/analytics">Analytics</NavLink>

          {auth.user?.isPlatformAdmin && (
            <>
              <div className="nav-section">Administration</div>
              <NavLink to="/users">Users</NavLink>
              <NavLink to="/tenants">Tenants</NavLink>
	            <NavLink to="/memberships">Memberships</NavLink>
              <NavLink to="/agents">Agents</NavLink>
           </>
	)}
	</nav>
        <div className="environment"><span /> Secure portal</div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="topbar-actions">
            {auth.tenants.length > 0 && (
              <select
                className="tenant-picker"
                value={auth.selectedTenantId ?? ""}
                onChange={(event) => auth.selectTenant(event.target.value)}
                aria-label="Current tenant"
              >
                {auth.tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </select>
            )}
            <span className="signed-in-user">{auth.user?.displayName || auth.user?.email}</span>
            <button className="logout-button" onClick={() => void auth.logout()}>Sign out</button>
          </div>
        </header>
        <div className="page-content">{children}</div>

      </main>
    </div>
  );
}
