// src/services/stockService.ts
import { supabase } from "../lib/supabase";

export type Stock = {
    householdId: string;
    product: string;
    qty_needed: number;
    qty_in_stock: number;
    unit: string;
    last_updated: string;
};

export async function getStocks(householdId: string): Promise<Stock[]> {
  try {
    const { data, error } = await supabase
      .from("stocks")
      .select(`
        household,
        product_name,
        qty_needed,
        qty_available,
        unit,
        updated_at
      `)
      .eq("household", householdId);

    if (error) {
      console.error("Erreur lors de la récupération des stocks:", error);
      throw new Error("Impossible de récupérer les stocks");
    }

    if (!data) {
      return [];
    }

    // Formater les données pour correspondre au type Stock
    return data.map((item) => ({
      householdId: item.household,
      product: item.product_name,
      qty_needed: item.qty_needed,
      qty_in_stock: item.qty_available,
      unit: item.unit,
      last_updated: item.updated_at,
    }));
  } catch (error) {
    console.error("Erreur dans getStocks:", error);
    throw error;
  }
}

export async function addStock(stock: Stock, householdId: string): Promise<void> {
    if (stock.householdId === "" && householdId) {
        stock.householdId = householdId;
    }

  try {
    const { data: newProduct, error: createError } = await supabase
        .from("stocks")
        .insert({
            household: stock.householdId,
            product_name: stock.product,
            qty_needed: stock.qty_needed,
            qty_available: stock.qty_in_stock,
            unit: stock.unit,
            updated_at: stock.last_updated,
        })
        .select("*")
        .single();

    if (createError) {
        console.error("Erreur lors de la création du produit:", createError);
        throw new Error("Impossible de créer le produit");
    }

    return newProduct;

  } catch (error) {
    console.error("Erreur dans addStock:", error);
    throw error;
  }
}
