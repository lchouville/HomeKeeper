// src/services/householdService.ts
import { supabase } from "../lib/supabase";

export type Household = {
  id: string;
  name: string;
};

export async function getUserHouseholds(userId: string) {
  // Récupérer les ménages via la table de jointure household_members
  const { data, error } = await supabase
    .from("household_members")
    .select(`
      households:households(id, name)
    `)
    .eq("profile_id", userId);

  if (error) {
    console.error("Erreur lors de la récupération des ménages:", error);
    throw error;
  }

  // Extraire les ménages de la réponse
  return data?.map((item) => item.households) || [];
}
