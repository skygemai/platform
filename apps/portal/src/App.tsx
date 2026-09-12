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

function PortalRoutes() {
  const { selectedTenantId } = useAuth();
  const tenantKey = selectedTenantId ?? "no-tenant";

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CallsPage key={tenantKey} />} />
        <Route path="/analytics" element={<AnalyticsPage key={tenantKey} />} />
        <Route path="/users" element={<RequirePlatformAdmin><UsersPage /></RequirePlatformAdmin>} />
        <Route path="/tenants" element={<RequirePlatformAdmin><TenantsPage /></RequirePlatformAdmin>} />
        <Route path="/memberships" element={<RequirePlatformAdmin><MembershipsPage /></RequirePlatformAdmin>} />
        <Route path="/agents" element={<RequirePlatformAdmin><AgentsPage /></RequirePlatformAdmin>} />
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
