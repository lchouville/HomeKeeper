import { Link, useNavigate } from "react-router-dom";
import { logout } from "../../services/authService";
import { LogOut, Menu, User, X } from "lucide-react";

type HeaderProps = {
  page?: string;
  user?: {
    pseudo: string;
    role: "user" | "admin";
  } | null;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export function Header({ page, user,sidebarOpen,setSidebarOpen }: HeaderProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-[var(--bg-700)] border-b border-[var(--bg-600)]">
      <div className="max-w-screen-xl mx-auto flex items-center justify-between px-4 py-3">
        {/* Burger */}
        {/* burger mobile */}
        <button
            className="md:hidden text-white z-[60]"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            >{sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Logo + page */}
        <div className="flex flex-col">
          <Link
            to="/"
            className="text-xl md:text-2xl font-bold text-white"
          >
            HomeKeeper
          </Link>

          {page && (
            <span className="text-xs md:text-sm text-slate-400">
              {page}
            </span>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-3">

          {user && (
            <Link
              to="/profile"
              className="flex items-center gap-2 text-white hover:text-blue-400 transition"
            >
              <User size={18} />
              <span className="hidden sm:block">{user.pseudo}</span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-white hover:text-red-400 transition"
          >
            <LogOut size={18} />
            <span className="hidden sm:block">Logout</span>
          </button>

        </div>
      </div>
    </header>
  );
}