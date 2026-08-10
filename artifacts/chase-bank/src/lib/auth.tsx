import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useLocation } from "wouter";
import { UserProfile } from "@workspace/api-client-react";

type AuthContextType = {
  token: string | null;
  user: UserProfile | null;
  isAdmin: boolean;
  login: (token: string, user: UserProfile | null, isAdmin: boolean) => void;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("chase_token"));
  const [user, setUser] = useState<UserProfile | null>(() => {
    const u = localStorage.getItem("chase_user");
    return u ? JSON.parse(u) : null;
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(() => localStorage.getItem("chase_is_admin") === "true");
  const [, setLocation] = useLocation();

  const login = (newToken: string, newUser: UserProfile | null, newIsAdmin: boolean) => {
    localStorage.setItem("chase_token", newToken);
    if (newUser) localStorage.setItem("chase_user", JSON.stringify(newUser));
    localStorage.setItem("chase_is_admin", String(newIsAdmin));
    setToken(newToken);
    setUser(newUser);
    setIsAdmin(newIsAdmin);
  };

  const logout = () => {
    localStorage.removeItem("chase_token");
    localStorage.removeItem("chase_user");
    localStorage.removeItem("chase_is_admin");
    setToken(null);
    setUser(null);
    setIsAdmin(false);
    setLocation("/");
  };

  return (
    <AuthContext.Provider value={{ token, user, isAdmin, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
