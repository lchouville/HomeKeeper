import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../../lib/supabase";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<null | undefined | any>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: any } }) => {
      return setUser(data.user);
    });
  }, []);

  if (user === undefined) return null;
  if (!user) return <Navigate to="/login" />;
  return children;
}