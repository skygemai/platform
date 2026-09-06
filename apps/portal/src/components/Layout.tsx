import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-gem">S</span>SkyGem AI</div>
        <nav aria-label="Main navigation">
          <div className="nav-section">Client portal</div>
          <NavLink to="/">Calls</NavLink>
          <NavLink to="/analytics">Analytics</NavLink>
          <div className="nav-section">Administration</div>
          <NavLink to="/users">Users</NavLink>
          <NavLink to="/tenants">Tenants</NavLink>
	  <NavLink to="/memberships">Memberships</NavLink>
        </nav>
        <div className="environment"><span /> Local environment</div>
      </aside>
      <main className="content">
        <header className="topbar"><span>SkyGem control center</span></header>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
