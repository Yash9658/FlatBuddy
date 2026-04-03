import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { apiBaseUrl } from "@/lib/constants";
import { apiFetch, ApiError, configureApiAuthHandlers } from "@/lib/api";
import type { AuthUser, UserRole } from "@/lib/types";

type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  isGoogleOAuthEnabled: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: RegisterPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  completeOAuth: (token: string) => Promise<AuthUser>;
  updateRoleSelection: (role: UserRole) => Promise<AuthUser>;
  refreshUser: () => Promise<void>;
  getOAuthUrl: (role?: UserRole) => string;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const storageKey = "flatbuddy_access_token";

async function loadCurrentUser(token: string) {
  return apiFetch<AuthUser>("/auth/me", {
    method: "GET",
    token,
  });
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => sessionStorage.getItem(storageKey) ?? null,
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleOAuthEnabled, setIsGoogleOAuthEnabled] = useState(false);
  const refreshRequestRef = useRef<Promise<string | null> | null>(null);

  function clearSessionState() {
    sessionStorage.removeItem(storageKey);
    setAccessToken(null);
    setUser(null);
  }

  async function refreshAccessToken() {
    if (!refreshRequestRef.current) {
      refreshRequestRef.current = apiFetch<{ accessToken: string; user: AuthUser }>("/auth/refresh", {
        method: "POST",
        skipAuthRefresh: true,
      })
        .then((response) => {
          sessionStorage.setItem(storageKey, response.accessToken);
          setAccessToken(response.accessToken);
          setUser(response.user);
          setError(null);
          return response.accessToken;
        })
        .catch((authError) => {
          clearSessionState();
          if (authError instanceof ApiError && authError.status === 403) {
            setError(authError.message);
          }
          return null;
        })
        .finally(() => {
          refreshRequestRef.current = null;
        });
    }

    return refreshRequestRef.current;
  }

  useEffect(() => {
    configureApiAuthHandlers({
      refreshAccessToken,
      handleAuthFailure: () => {
        clearSessionState();
      },
    });

    return () => {
      configureApiAuthHandlers(null);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function bootstrap() {
      try {
        try {
          const authConfig = await apiFetch<{ googleOAuthEnabled: boolean }>("/auth/config", {
            method: "GET",
          });
          if (!ignore) {
            setIsGoogleOAuthEnabled(authConfig.googleOAuthEnabled);
          }
        } catch {
          if (!ignore) {
            setIsGoogleOAuthEnabled(false);
          }
        }

        const token = sessionStorage.getItem(storageKey);

        if (token) {
          try {
            const currentUser = await loadCurrentUser(token);
            if (!ignore) {
              setAccessToken(token);
              setUser(currentUser);
            }
            return;
          } catch (authError) {
            if (!(authError instanceof ApiError && (authError.status === 401 || authError.status === 403))) {
              throw authError;
            }

            clearSessionState();
            if (!ignore) {
              setError(authError.message);
            }
          }
        }

        const refreshResponse = await apiFetch<{ accessToken: string; user: AuthUser }>("/auth/refresh", {
          method: "POST",
          skipAuthRefresh: true,
        });

        if (!ignore) {
          sessionStorage.setItem(storageKey, refreshResponse.accessToken);
          setAccessToken(refreshResponse.accessToken);
          setUser(refreshResponse.user);
        }
      } catch (authError) {
        if (authError instanceof ApiError && (authError.status === 401 || authError.status === 403)) {
          clearSessionState();
          if (!ignore && authError.status === 403) {
            setError(authError.message);
          }
          return;
        }

        if (!ignore) {
          setError(authError instanceof Error ? authError.message : "Unable to start session.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      ignore = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isLoading,
      error,
      isGoogleOAuthEnabled,
      getOAuthUrl: (role = "TENANT") => {
        const url = new URL(`${apiBaseUrl}/auth/google`);
        url.searchParams.set("role", role);
        return url.toString();
      },
      clearError: () => setError(null),
      login: async (email, password) => {
        const response = await apiFetch<{ accessToken: string; user: AuthUser }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        sessionStorage.setItem(storageKey, response.accessToken);
        setAccessToken(response.accessToken);
        const currentUser = await loadCurrentUser(response.accessToken);
        setUser(currentUser);
        setError(null);
        return currentUser;
      },
      register: async (payload) => {
        const response = await apiFetch<{ accessToken: string; user: AuthUser }>("/auth/register", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        sessionStorage.setItem(storageKey, response.accessToken);
        setAccessToken(response.accessToken);
        const currentUser = await loadCurrentUser(response.accessToken);
        setUser(currentUser);
        setError(null);
        return currentUser;
      },
      completeOAuth: async (token) => {
        sessionStorage.setItem(storageKey, token);
        setAccessToken(token);
        const currentUser = await loadCurrentUser(token);
        setUser(currentUser);
        setError(null);
        return currentUser;
      },
      updateRoleSelection: async (role) => {
        if (!accessToken) {
          throw new Error("Authentication required.");
        }

        const updatedUser = await apiFetch<AuthUser>("/profile/role", {
          method: "PUT",
          token: accessToken,
          body: JSON.stringify({ role }),
        });

        setUser(updatedUser);
        setError(null);
        return updatedUser;
      },
      logout: async () => {
        await apiFetch("/auth/logout", {
          method: "POST",
          token: accessToken,
          skipAuthRefresh: true,
        });
        sessionStorage.removeItem(storageKey);
        setAccessToken(null);
        setUser(null);
      },
      refreshUser: async () => {
        if (!accessToken) {
          return;
        }

        const currentUser = await loadCurrentUser(accessToken);
        setUser(currentUser);
      },
    }),
    [accessToken, error, isGoogleOAuthEnabled, isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
