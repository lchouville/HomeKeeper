import { Link } from "react-router-dom";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  return (
    <>
      {/* overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
        fixed md:relative
        z-30
        h-full
        w-64
        bg-slate-800
        transform
        transition-transform
        duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}
      >

        <div className="p-4 text-white font-bold text-xl">
          HomeKeeper
        </div>

        <nav className="flex flex-col p-2 gap-2">

          <Link
            to="/"
            className="p-2 rounded hover:bg-slate-700 text-white"
          >
            Dashboard
          </Link>

          <Link
            to="/finance"
            className="p-2 rounded hover:bg-slate-700 text-white"
          >
            Finances
          </Link>

          <Link
            to="/stocks"
            className="p-2 rounded hover:bg-slate-700 text-white"
          >
            Stock
          </Link>

          <Link
            to="/courses"
            className="p-2 rounded hover:bg-slate-700 text-white"
          >
            Courses
          </Link>

        </nav>

      </aside>
    </>
  );
}