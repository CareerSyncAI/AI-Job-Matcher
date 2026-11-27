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
  name?: string | null;
  full_name?: string | null;
  organization_name?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (
    email: string,
    password: string,
    role: UserRole,
    fullName?: string,
    organizationName?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to enrich base auth user with profile name and organization
  const enrichUserWithProfile = async (baseUser: User, token?: string): Promise<User> => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
      const res = await (config ? axios.get(`${API_BASE_URL}/auth/profile`, config) : api.get("/auth/profile"));
      if (res.data) {
        return {
          ...baseUser,
          name: res.data.name || res.data.full_name || baseUser.name || null,
          full_name: res.data.name || res.data.full_name || baseUser.full_name || null,
          organization_name: res.data.organization_name || baseUser.organization_name || null,
        };
      }
    } catch {
      // Profile endpoint failure fallback
    }
    return baseUser;
  };

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
          const enriched = await enrichUserWithProfile(res.data.user, res.data.access_token);
          if (!cancelled) {
            setUser(enriched);
          }
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

  const login = useCallback(async (email: string, password: string, rememberMe?: boolean) => {
    const res = await api.post("/auth/login", { email, password });
    setAccessToken(res.data.access_token);
    const enriched = await enrichUserWithProfile(res.data.user);
    setUser(enriched);
    if (typeof window !== "undefined") {
      if (rememberMe) {
        localStorage.setItem("careersync_remember_me", "true");
        localStorage.setItem("careersync_remember_email", email);
      } else {
        localStorage.removeItem("careersync_remember_me");
        localStorage.removeItem("careersync_remember_email");
      }
    }
  }, []);

  const register = useCallback(
    async (
      email: string,
      password: string,
      role: UserRole,
      fullName?: string,
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
      if (fullName && fullName.trim()) {
        try {
          await api.put("/auth/profile", {
            name: fullName.trim(),
            full_name: fullName.trim(),
          });
        } catch {
          // Ignore initial name sync error
        }
      }
      const enriched = await enrichUserWithProfile(res.data.user);
      setUser(enriched);
    },
    []
  );

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get("/auth/me");
      if (res.data) {
        const enriched = await enrichUserWithProfile(res.data);
        setUser(enriched);
      }
    } catch (err) {
      console.warn("Failed to refresh user:", err);
    }
  }, []);

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
      refreshUser,
    }),
    [user, isAuthenticated, isLoading, login, register, logout, refreshUser]
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
