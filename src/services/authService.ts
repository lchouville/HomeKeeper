import { supabase } from "../lib/supabase";

export type AuthUser = {
    id: string;
    pseudo: string;
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
        console.log("Recherche du profil pour pseudo :", identifier);
        console.log("Résultat de la recherche :", profile, profileError);
        if (profileError || !profile) {
            throw new Error(profileError?.message || "Pseudo non trouvé");
        }
        if (!profile.email) {
            throw new Error("Aucun email associé à ce pseudo");
        }
        console.log("Profile trouvé :", profile);
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
        role: profile.role,
    };
    return currentUser;
}

export async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
}

export function getCurrentUser(): AuthUser | null {
    console.log("Current user:", currentUser);
    return currentUser;
}