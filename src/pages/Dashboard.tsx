import { useEffect, useState } from "react";
import { Footer } from "../components/ui/Footer";
import { Header } from "../components/ui/Header";
import { getCurrentUser } from "../services/authService";
import type { AuthUser } from "../services/authService";
import DashboardLayout from "../components/layout/DashboardLayout";

function Dashboard() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    async function load() {
      await getCurrentUser().then(setUser);
      if (!user) return;
    }

    load();
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <Header page="dashboard" user={user}/>
      <main className="flex-1 overflow-hidden">
        <DashboardLayout>
          <div className=" text-white">
            <h1 className="text-3xl font-bold">Dashboard</h1>
          </div>
        </DashboardLayout>
      </main>
      <Footer/>
    </div>
  );
}

export default Dashboard;