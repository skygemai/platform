import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "./auth.css";

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (auth.loading) {
    return <main className="auth-screen"><section className="auth-card"><h1>SkyGem AI</h1><p>Loading your portal…</p></section></main>;
  }

  if (!auth.authenticated) {
    return (
      <main className="auth-screen">
        <section className="auth-card">
          <div className="auth-gem">S</div>
          <h1>SkyGem AI</h1>
          <p>Sign in to access the SkyGem control center.</p>
          {auth.error && <p className="form-error" role="alert">{auth.error}</p>}
          <button className="button primary" onClick={() => void auth.login()}>Sign in</button>
        </section>
      </main>
    );
  }

  return children;
}

export function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return user?.isPlatformAdmin ? children : <Navigate to="/" replace />;
}
