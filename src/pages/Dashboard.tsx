import { useEffect, useState } from "react";
import { Footer } from "../components/ui/Footer";
import { Header } from "../components/ui/Header";
import { getCurrentUser } from "../services/authService";
import type { AuthUser } from "../services/authService";
import Sidebar from "../components/ui/Sidebar";

function Dashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function load() {
      await getCurrentUser().then(setUser);
      if (!user) return;
    }

    load();
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <Header page="dashboard" user={user} />

      <main className="flex flex-1 overflow-hidden">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <div className="flex flex-1 bg-[var(--bg-200)]">
          <h1 className="text-white">Dashboard</h1>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Dashboard;