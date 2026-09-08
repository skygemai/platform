import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { getCurrentUser, signInWithRedirect, signOut } from "aws-amplify/auth";
import { authorizedRequest } from "../api/client";
import { getSelectedTenantId, storeSelectedTenantId } from "./tenant-selection";

export interface SessionTenant {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member" | "viewer" | null;
}

export interface SessionUser {
  cognitoSub: string;
  email: string | null;
  displayName: string | null;
  isPlatformAdmin: boolean;
}

interface SessionResponse {
  user: SessionUser;
  tenants: SessionTenant[];
}

interface AuthValue {
  loading: boolean;
  authenticated: boolean;
  error: string | null;
  user: SessionUser | null;
  tenants: SessionTenant[];
  selectedTenantId: string | null;
  selectTenant: (tenantId: string) => void;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tenants, setTenants] = useState<SessionTenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(getSelectedTenantId());

  const loadSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!(import.meta.env.DEV && import.meta.env.VITE_DEV_USER_SUB)) {
        await getCurrentUser();
      }
      const response = await authorizedRequest<SessionResponse>("/api/session");
      setAuthenticated(true);
      setUser(response.user);
      setTenants(response.tenants);

      const stored = getSelectedTenantId();
      const nextTenantId = response.tenants.some((tenant) => tenant.id === stored)
        ? stored
        : response.tenants[0]?.id ?? null;
      setSelectedTenantId(nextTenantId);
      storeSelectedTenantId(nextTenantId);
    } catch (reason) {
      setAuthenticated(false);
      setUser(null);
      setTenants([]);
      storeSelectedTenantId(null);
      if (
        reason instanceof Error &&
        reason.message !== "Authentication required" &&
        !reason.message.toLowerCase().includes("needs to be authenticated")
      ) {
        setError(reason.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadSession(); }, [loadSession]);

  function selectTenant(tenantId: string) {
    if (!tenants.some((tenant) => tenant.id === tenantId)) return;
    setSelectedTenantId(tenantId);
    storeSelectedTenantId(tenantId);
  }

  async function login() {
    await signInWithRedirect();
  }

  async function logout() {
    storeSelectedTenantId(null);
    await signOut();
  }

  const value = useMemo<AuthValue>(() => ({
    loading,
    authenticated,
    error,
    user,
    tenants,
    selectedTenantId,
    selectTenant,
    login,
    logout
  }), [loading, authenticated, error, user, tenants, selectedTenantId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
