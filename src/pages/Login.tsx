import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("pseudo, role")
      .eq("id", data.user?.id)
      .single();

    if (profileError) {
      setError(profileError.message);
      return;
    }

    console.log("Connecté :", profile.pseudo, profile.role);

    navigate("/"); 
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <form
        onSubmit={handleLogin}
        className="bg-slate-800 p-8 rounded-xl w-96 space-y-4"
      >
        <h1 className="text-white text-2xl font-bold">Connexion</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 rounded bg-slate-700 text-white placeholder-slate-400"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Mot de passe"
          className="w-full p-2 rounded bg-slate-700 text-white placeholder-slate-400"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
        >
          Se connecter
        </button>
      </form>
    </div>
  );
}