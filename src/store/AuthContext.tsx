import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiClient, COOKIE_SESSION_TOKEN } from "../lib/apiClient";
import type { AuthLoginResponse, AuthSession, AuthUser } from "../types";

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildCookieSession = (user: AuthUser): AuthSession => ({
  token: COOKIE_SESSION_TOKEN,
  user,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authRequestSequence = useRef(0);

  const beginAuthRequest = () => {
    authRequestSequence.current += 1;
    return authRequestSequence.current;
  };

  const isLatestAuthRequest = (requestId: number) =>
    authRequestSequence.current === requestId;

  const logout = useCallback(() => {
    beginAuthRequest();
    setSession(null);
    setIsLoading(false);
  }, []);

  const refreshSession = useCallback(async () => {
    const requestId = beginAuthRequest();
    setIsLoading(true);

    try {
      const user = await apiClient.get<AuthUser>("/api/auth/me");

      if (!isLatestAuthRequest(requestId)) {
        return;
      }

      setSession(buildCookieSession(user));
    } catch {
      if (!isLatestAuthRequest(requestId)) {
        return;
      }

      setSession(null);
    } finally {
      if (isLatestAuthRequest(requestId)) {
        setIsLoading(false);
      }
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const requestId = beginAuthRequest();
    const sessionData = await apiClient.post<AuthLoginResponse>(
      "/api/auth/login",
      {
        username,
        password,
      },
    );

    if (!isLatestAuthRequest(requestId)) {
      return;
    }

    setSession(buildCookieSession(sessionData.user));
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
