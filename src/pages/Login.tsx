import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const user = await login(identifier, password);

      console.log("Connecté :", user.pseudo, user.role);

      navigate("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-900)]">
      <form
        onSubmit={handleLogin}
        className="bg-[var(--bg-800)] p-8 rounded-xl w-96 space-y-4"
      >
        <h1 className="text-white text-2xl font-bold">Connexion</h1>

        <input
          type="text"
          placeholder="Email ou pseudo"
          className="w-full p-3 rounded bg-[var(--bg-700)] text-white placeholder-slate-400"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Mot de passe"
          className="w-full p-3 rounded bg-[var(--bg-700)] text-white placeholder-slate-400"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          className="w-full bg-[var(--bg-500)] hover:bg-[var(--bg-600)] text-white p-3 rounded transition"
        >
          Se connecter
        </button>
      </form>
    </div>
  );
}