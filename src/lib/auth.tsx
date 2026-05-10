import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const USERNAME = "admin";
const PASSWORD = "admin";
const STORAGE_KEY = "bs_local_auth";

const LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001";
type LocalUser = { id: string; username: string; email: string };

type AuthCtx = {
  user: LocalUser | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  const signIn = async (username: string, password: string) => {
    if (username.trim().toLowerCase() === USERNAME && password === PASSWORD) {
      const u: LocalUser = { id: LOCAL_USER_ID, username: USERNAME, email: "admin@local" };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      setUser(u);
      return { error: null };
    }
    return { error: "Invalid username or password" };
  };

  const signOut = async () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
