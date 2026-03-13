import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isEmailVerified?: boolean;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isReady: boolean;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: (user: AuthUser) => void;
};

const TOKEN_KEY = "grantflow.auth.token";
const USER_KEY = "grantflow.auth.user";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY);
    const storedUser = window.localStorage.getItem(USER_KEY);

    if (storedToken) {
      setToken(storedToken);
    }

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser) as AuthUser);
      } catch {
        window.localStorage.removeItem(USER_KEY);
      }
    }

    setIsReady(true);
  }, []);

  function setSession(nextToken: string, nextUser: AuthUser) {
    setToken(nextToken);
    setUser(nextUser);
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }

  function refreshUser(nextUser: AuthUser) {
    setUser(nextUser);
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }

  function logout() {
    setToken(null);
    setUser(null);
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }

  return (
    <AuthContext.Provider value={{ token, user, isReady, setSession, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
