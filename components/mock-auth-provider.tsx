"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type MockRole = "candidate" | "interviewer";

type MockUser = {
  name: string;
  email: string;
  role: MockRole;
};

type MockAuthContextValue = {
  isReady: boolean;
  user: MockUser | null;
  isAuthenticated: boolean;
  signIn: (payload: { email: string; password: string }) => void;
  signUp: (payload: { name: string; email: string; password: string; role: MockRole }) => void;
  signOut: () => void;
};

const STORAGE_KEY = "verifai-mock-auth";
const MockAuthContext = createContext<MockAuthContextValue | null>(null);

function inferRoleFromEmail(email: string): MockRole {
  return email.toLowerCase().includes("candidate") ? "candidate" : "interviewer";
}

export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw) as MockUser);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsReady(true);
  }, []);

  const persistUser = (nextUser: MockUser | null) => {
    setUser(nextUser);
    if (nextUser) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const value = useMemo<MockAuthContextValue>(
    () => ({
      isReady,
      user,
      isAuthenticated: Boolean(user),
      signIn: ({ email }) => {
        const normalizedEmail = email.trim().toLowerCase();
        persistUser({
          name: normalizedEmail.split("@")[0] || "VerifAI User",
          email: normalizedEmail,
          role: inferRoleFromEmail(normalizedEmail),
        });
      },
      signUp: ({ name, email, role }) => {
        persistUser({
          name: name.trim() || "VerifAI User",
          email: email.trim().toLowerCase(),
          role,
        });
      },
      signOut: () => {
        persistUser(null);
      },
    }),
    [isReady, user],
  );

  return <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>;
}

export function useMockAuth() {
  const context = useContext(MockAuthContext);
  if (!context) {
    throw new Error("useMockAuth must be used within MockAuthProvider");
  }
  return context;
}
