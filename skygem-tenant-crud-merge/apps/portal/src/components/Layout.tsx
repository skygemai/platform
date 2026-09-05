import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <aside>
        <div className="brand"><span className="brand-gem">S</span>SkyGem AI</div>
        <nav>
          <NavLink to="/">Calls</NavLink>
          <NavLink to="/analytics">Analytics</NavLink>
          <div className="nav-section">Administration</div>
          <NavLink to="/tenants">Tenants</NavLink>
        </nav>
      </aside>
      <main>
        <header><h1>SkyGem platform</h1></header>
        {children}
      </main>
    </div>
  );
}
