import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <aside>
        <div className="brand">SkyGem AI</div>
        <nav>
          <NavLink to="/">Calls</NavLink>
          <NavLink to="/analytics">Analytics</NavLink>
        </nav>
      </aside>
      <main>
        <header><h1>Client portal</h1></header>
        {children}
      </main>
    </div>
  );
}
