import { useNavigate } from "react-router-dom";
import { logout } from "../../services/authService";

type HeaderProps = {
    page?: string;
    user?: {
        pseudo: string;
        role: "user" | "admin";
    } | null;
};

export function Header({ page, user }: HeaderProps) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        logout();
        navigate("/login");
    };

    return (
        <header className="bg-slate-800 p-4 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-white">HomeKeeper</h1>
            {page && <p className="text-sm text-slate-400">{page}</p>}
        </div>
        <div>
        {user && <p className="text-white">{user.pseudo}</p>}
        <button
            onClick={handleLogout}
            className="text-white hover:text-blue-400 cursor-pointer"
        >
            Déconnexion
        </button>
        </div>
        </header>
    );
}