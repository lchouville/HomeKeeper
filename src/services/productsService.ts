// src/services/productsService.ts
import { supabase } from "../lib/supabase";

export type Product = {
  productId: string;
  ean:string;
  qty: number;
  unit:string;
  created_at: string;
};

export async function getProduct(productId: string): Promise<Product[]> {
    const { data, error } = await supabase
    .from("stocks")
    .select(`
      product,
      ean,
      qty,
      unit,
      created_at
    `)
    .eq("product", productId);

  if (error) {
    console.error("Erreur récupération stocks:", error);
    throw new Error("Impossible de récupérer les stocks");
  }

  if (!data) return [];

  return data.map((item) => ({
    productId: item.product,
    ean: item.ean,
    qty: item.qty,
    unit: item.unit,
    created_at: item.created_at
  }));
}