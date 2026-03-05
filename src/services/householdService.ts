import { supabase } from "../lib/supabase";

export async function getUserHouseholds(userId: string) {
  const { data, error } = await supabase
    .from("household_members")
    .select(`
      households (
        id,
        name
      )
    `)
    .eq("user_id", userId);

  if (error) throw error;

  return data.map((item) => item.households);
}