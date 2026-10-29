import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthGate, RequirePlatformAdmin } from "./auth/AuthGate";
import { useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { AnalyticsPage } from "./features/analytics/AnalyticsPage";
import { CallsPage } from "./features/calls/CallsPage";
import { TenantsPage } from "./features/tenants/TenantsPage";
import { UsersPage } from "./features/users/UsersPage";
import { MembershipsPage } from "./features/memberships/MembershipsPage";
import { AgentsPage } from "./features/agents/AgentsPage";
import type { ReactNode } from "react";

function PortalRoutes() {
  const { selectedTenantId } = useAuth();
  const tenantKey = selectedTenantId ?? "no-tenant";

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CallsPage key={tenantKey} />} />
        <Route path="/analytics" element={<AnalyticsPage key={tenantKey} />} />
        <Route 
          path="/users" 
          element={
            <RequireTenantManager>
              <UsersPage />
            </RequireTenantManager>
          }
        /> 
        <Route 
          path="/tenants" 
          element={
            <RequireTenantManager>
              <TenantsPage />
            </RequireTenantManager>
          }
        /> 
        <Route 
          path="/memberships" 
          element={
            <RequireTenantManager>
              <MembershipsPage />
            </RequireTenantManager>
          }
        /> 
        <Route 
          path="/agents" 
          element={
            <RequireTenantManager>
              <AgentsPage />
            </RequireTenantManager>
          }
        /> 
      </Routes>
    </Layout>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthGate><PortalRoutes /></AuthGate>
    </BrowserRouter>
  );
}

function RequireTenantManager({ children }: { children: React.ReactNode }) {
  const { user, tenants } = useAuth();

  const allowed =
    user?.isPlatformAdmin ||
    tenants.some((tenant) => (tenant.role === "owner" || tenant.role === "admin"));

  return allowed
    ? <>{children}</>
    : <p>You do not have permission to manage tenants.</p>;
}
