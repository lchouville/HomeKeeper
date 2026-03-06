import { Link } from "react-router-dom";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  return (
    <>
      {/* Bouton pour ouvrir/fermer le menu sur mobile */}
      <button
        className="md:hidden bg-[var(--bg-800)] text-white rounded"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? "✕" : "☰"}
      </button>

      {/* Overlay pour fermer le menu en cliquant à côté */}
      {sidebarOpen && (
        <div
          className="fixed h-full inset-0 bg-black bg-opacity-0 md:hidden z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Menu latéral */}
      <aside
        className={`
          fixed md:relative
          z-30
          h-full
          w-64
          bg-[var(--bg-800)]
          transform
          transition-transform
          duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          rounded
          md:rounded-none
        `}
      >
        <nav className="flex flex-col p-2 gap-2">
          <Link
            to="/"
            className="p-2 rounded hover:bg-[var(--bg-600)] text-white"
            onClick={() => setSidebarOpen(false)}
          >
            Dashboard
          </Link>

          <Link
            to="/finance"
            className="p-2 rounded hover:bg-[var(--bg-600)] text-white"
            onClick={() => setSidebarOpen(false)}
          >
            Finances
          </Link>

          <Link
            to="/stocks"
            className="p-2 rounded hover:bg-[var(--bg-600)] text-white"
            onClick={() => setSidebarOpen(false)}
          >
            Stock
          </Link>

          <Link
            to="/courses"
            className="p-2 rounded hover:bg-[var(--bg-600)] text-white"
            onClick={() => setSidebarOpen(false)}
          >
            Courses
          </Link>
        </nav>
      </aside>
    </>
  );
}
