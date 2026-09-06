import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AnalyticsPage } from "./features/analytics/AnalyticsPage";
import { CallsPage } from "./features/calls/CallsPage";
import { TenantsPage } from "./features/tenants/TenantsPage";
import { UsersPage } from "./features/users/UsersPage";
import { MembershipsPage } from "./features/memberships/MembershipsPage";

export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<CallsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/tenants" element={<TenantsPage />} />
	  <Route path="/memberships" element={<MembershipsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
