import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type HeaderProps = {
    page?: string;
};

export function Header({ page = "" }: HeaderProps) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/login");
    };

    return (
        <header className="bg-slate-800 p-4 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-white">HomeKeeper</h1>
            {page && <p className="text-sm text-slate-400">{page}</p>}
        </div>

        <button
            onClick={handleLogout}
            className="text-white hover:text-blue-400"
        >
            Déconnexion
        </button>
        </header>
    );
}