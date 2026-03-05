import { useEffect, useState } from "react";
import { Footer } from "../components/ui/Footer";
import { Header } from "../components/ui/Header";
import { getCurrentUser } from "../services/authService";
import type { AuthUser } from "../services/authService";

function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Header page="dashboard" user={user}/>
      <div id="home" className="flex-1 flex items-center justify-center">
        <p className="text-4xl font-bold text-white">Home</p>
      </div>
      <Footer/>
    </div>
  );
}

export default Home;