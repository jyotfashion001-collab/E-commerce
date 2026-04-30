import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { apiBase } from "./api";

export interface AuthUser {
  id: number;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: "admin" | "staff";
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

const TOKEN_KEY = "orderhub_auth_token";

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function postJson<T>(url: string, body: unknown, token?: string | null): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : typeof data === "string"
        ? data
        : `Request failed (${res.status})`);
    throw new Error(message);
  }
  return data as T;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Wire token into the generated API client once
  useEffect(() => {
    setAuthTokenGetter(() => readToken());
    return () => setAuthTokenGetter(null);
  }, []);

  // Bootstrap: if we have a token, hydrate the user
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      const t = readToken();
      if (!t) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${apiBase}/auth/me`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (!res.ok) throw new Error("session expired");
        const data = (await res.json()) as AuthUser;
        if (!cancelled) {
          setUser(data);
          setToken(t);
        }
      } catch {
        writeToken(null);
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await postJson<AuthResponse>(`${apiBase}/auth/login`, { email, password });
    writeToken(data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    const data = await postJson<AuthResponse>(`${apiBase}/auth/register`, {
      email,
      password,
      fullName,
    });
    writeToken(data.token);
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    writeToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
