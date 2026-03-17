import { Link, useLocation } from "react-router-dom";
import { Home, Wallet, Package, ShoppingCart, Menu, X } from "lucide-react";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const location = useLocation();

  const nav = [
    { name: "Dashboard", path: "/", icon: Home },
    { name: "Finances", path: "/finance", icon: Wallet },
    { name: "Stock", path: "/stocks", icon: Package },
    { name: "Courses", path: "/courses", icon: ShoppingCart },
  ];

  return (
    <>
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed md:relative
        z-50
        h-full
        w-64
        bg-[var(--bg-800)]
        shadow-xl
        transform transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}
      >
        <nav className="flex flex-col p-4 gap-2 mt-10 md:mt-4">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                flex items-center gap-3
                p-3 rounded-lg
                transition
                ${
                  active
                    ? "bg-[var(--bg-600)] text-white"
                    : "text-gray-300 hover:bg-[var(--bg-700)]"
                }
              `}
              >
                <Icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}