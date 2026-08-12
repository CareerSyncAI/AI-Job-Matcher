"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { UserDTO, authAPI, LoginPayloadDTO, RegisterPayloadDTO } from "@/lib/api/auth";
import { setAccessToken } from "@/lib/api/client";

interface AuthContextType {
  user: UserDTO | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginPayloadDTO) => Promise<void>;
  register: (payload: RegisterPayloadDTO) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check existing session on load using HttpOnly refresh cookie
  const checkSession = useCallback(async () => {
    try {
      const tokenRes = await authAPI.refresh();
      setUser(tokenRes.user);
    } catch {
      setAccessToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (credentials: LoginPayloadDTO) => {
    setIsLoading(true);
    try {
      const res = await authAPI.login(credentials);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayloadDTO) => {
    setIsLoading(true);
    try {
      await authAPI.register(payload);
      await login({ email: payload.email, password: payload.password });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authAPI.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
