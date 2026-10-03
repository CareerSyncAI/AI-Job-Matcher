"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";
import api, { API_BASE_URL, setAccessToken } from "@/lib/api";

export type UserRole = "candidate" | "recruiter" | "admin";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  full_name?: string;
  organization_name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    role: UserRole,
    organizationName?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount via httpOnly cookie refresh directly
  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        if (!cancelled && res.data?.access_token) {
          setAccessToken(res.data.access_token);
          setUser(res.data.user);
        }
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    setAccessToken(res.data.access_token);
    setUser(res.data.user);
  }, []);

  const register = useCallback(
    async (
      email: string,
      password: string,
      role: UserRole,
      organizationName?: string
    ) => {
      await api.post("/auth/register", {
        email,
        password,
        role,
        organization_name: organizationName || null,
      });
      // Auto-login after registration
      const res = await api.post("/auth/login", { email, password });
      setAccessToken(res.data.access_token);
      setUser(res.data.user);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => !!user, [user]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isAuthenticated, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
