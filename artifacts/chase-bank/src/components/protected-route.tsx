import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { isAuthenticated, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation(adminOnly ? "/admin" : "/");
    } else if (adminOnly && !isAdmin) {
      setLocation("/dashboard");
    } else if (!adminOnly && isAdmin) {
      setLocation("/admin/dashboard");
    }
  }, [isAuthenticated, isAdmin, adminOnly, setLocation]);

  if (!isAuthenticated) return null;
  if (adminOnly && !isAdmin) return null;
  if (!adminOnly && isAdmin) return null;

  return <>{children}</>;
}
