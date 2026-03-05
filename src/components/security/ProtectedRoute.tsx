import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getCurrentUser, type AuthUser } from "../../services/authService";

export default function ProtectedRoute({
  children,
  profile = "user",
}: {
  children: ReactNode;
  profile?: "user" | "admin";
}) {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  // chargement
  if (user === undefined) {
    return null;
  }

  // pas connecté
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // pas les droits
  if (profile === "admin" && user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}