import { supabase } from "../lib/supabase";

export type AuthUser = {
    id: string;
    pseudo: string;
    email: string;
    role: "user" | "admin";
};

let currentUser: AuthUser | null = null;

export async function login(
    identifier: string,
    password: string
    ): Promise<AuthUser> {
    let emailToUse = identifier;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(identifier)) {
        
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, pseudo, role, email")
            .eq("pseudo", identifier)
            .maybeSingle();
        if (profileError || !profile) {
            throw new Error(profileError?.message || "Pseudo non trouvé");
        }
        if (!profile.email) {
            throw new Error("Aucun email associé à ce pseudo");
        }
        emailToUse = profile.email;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
    });

    if (error || !data.user) {
        throw new Error(error?.message || "Login failed");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("pseudo, role")
        .eq("id", data.user.id)
        .single();

    if (profileError || !profile) {
        throw new Error(profileError?.message || "Profile not found");
    }

    currentUser = {
        id: data.user.id,
        pseudo: profile.pseudo,
        email: data.user.email || "",
        role: profile.role,
    };
    return currentUser;
}

export async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  // Si l'utilisateur est déjà en cache, le retourner directement
  if (currentUser) {
    return currentUser;
  }

  // Récupérer la session actuelle
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  // Si pas de session, retourner null
  if (!session || sessionError) {
    console.error('Pas de session active:', sessionError?.message);
    return null;
  }

  const userId = session.user.id;
  const userEmail = session.user.email || '';

  // Récupérer le profil utilisateur depuis la table `profiles`
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('pseudo, role')
    .eq('id', userId)
    .single();

  // Si erreur ou profil introuvable, retourner null
  if (profileError || !profile) {
    console.error('Erreur lors de la récupération du profil:', profileError?.message);
    return null;
  }

  // Mettre à jour le cache et retourner l'utilisateur
  currentUser = {
    id: userId,
    email: userEmail,
    pseudo: profile.pseudo,
    role: profile.role,
  };

  return currentUser;
}

// Fonction pour réinitialiser le cache (utile après une déconnexion)
export function resetCurrentUser(): void {
  currentUser = null;
}
