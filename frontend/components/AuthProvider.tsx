"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import Spinner from "./Spinner";
import { useRouter } from "next/navigation";
import { getAuthToken, clearAuth, login as apiLogin } from "../lib/api";

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    await apiLogin(username, password);
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearAuth();
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("billDraft");
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
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

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <Spinner size={48} />
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
