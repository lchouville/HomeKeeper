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
    console.error("Erreur récupération stocks:", error);
    throw new Error("Impossible de récupérer les stocks");
  }

  if (!data) return [];

  return data.map((item) => ({
    householdId: item.household,
    product: item.product_name,
    qty_needed: item.qty_needed,
    qty_in_stock: item.qty_available,
    unit: item.unit,
    last_updated: item.updated_at,
  }));
}

export async function addStock(
  stock: Stock,
  householdId: string
): Promise<Stock> {
  const household = stock.householdId || householdId;

  const { data, error } = await supabase
    .from("stocks")
    .insert({
      household: household,
      product_name: stock.product,
      qty_needed: stock.qty_needed,
      qty_available: stock.qty_in_stock,
      unit: stock.unit,
      updated_at: stock.last_updated,
    })
    .select()
    .single();

  if (error) {
    console.error("Erreur création produit:", error);
    throw new Error("Impossible de créer le produit");
  }

  return {
    householdId: data.household,
    product: data.product_name,
    qty_needed: data.qty_needed,
    qty_in_stock: data.qty_available,
    unit: data.unit,
    last_updated: data.updated_at,
  };
}

export async function deleteStock(stock: Stock) {
  const { error } = await supabase
    .from("stocks")
    .delete()
    .eq("product_name", stock.product)
    .eq("household", stock.householdId);

  if (error) {
    console.error("Erreur suppression produit:", error);
    throw new Error("Impossible de supprimer le produit");
  }
}

export async function updateStock(stock: Stock): Promise<void> {
  const { error } = await supabase
    .from("stocks")
    .update({
      qty_available: stock.qty_in_stock,
      qty_needed: stock.qty_needed,
      unit: stock.unit,
      updated_at: stock.last_updated,
    })
    .eq("household", stock.householdId)
    .eq("product_name", stock.product);

  if (error) throw error;
}