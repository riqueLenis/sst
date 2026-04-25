import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiClient } from "../lib/apiClient";
import type { AuthSession, AuthUser } from "../types";

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
};

const SESSION_STORAGE_KEY = "sst-auth-session";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const readStoredSession = (): AuthSession | null => {
  const rawValue = localStorage.getItem(SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
};

const persistSession = (session: AuthSession | null) => {
  if (!session) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(() =>
    readStoredSession(),
  );
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    persistSession(null);
    setSession(null);
    setIsLoading(false);
  }, []);

  const refreshSession = useCallback(async () => {
    const currentSession = readStoredSession();

    if (!currentSession?.token) {
      logout();
      return;
    }

    try {
      const user = await apiClient.get<AuthUser>("/api/auth/me", {
        token: currentSession.token,
      });

      const nextSession = {
        token: currentSession.token,
        user,
      } satisfies AuthSession;

      persistSession(nextSession);
      setSession(nextSession);
    } catch {
      logout();
      return;
    }

    setIsLoading(false);
  }, [logout]);

  const login = useCallback(async (username: string, password: string) => {
    const sessionData = await apiClient.post<AuthSession>("/api/auth/login", {
      username,
      password,
    });

    persistSession(sessionData);
    setSession(sessionData);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      isAuthenticated: Boolean(session?.token),
      isLoading,
      login,
      logout,
      refreshSession,
    }),
    [isLoading, login, logout, refreshSession, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de AuthProvider.");
  }

  return context;
};