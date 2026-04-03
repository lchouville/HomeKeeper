// src/services/productsService.ts
import { supabase } from "../lib/supabase";

export type Product = {
  productId: string;
  name: string;
  ean:string;
  qty: number;
  unit:string;
  created_at: string;
};

export async function addProduct(product: Product): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      ean: product.ean,
      productId: product.productId,
      name: product.name,
      qty: product.qty,
      unit: product.unit,
    })
    .select()
    .single();

  if (error) {
    console.error("Erreur création produit:", error);
    throw new Error("Impossible de créer le produit");
  }

  if (!data) {
    throw new Error("Aucun produit créé");
  }

  return {
    productId: data.productId,
    name: data.name,
    ean: data.ean,
    qty: data.qty,
    unit: data.unit,
    created_at: data.created_at
  };
}

export async function getProduct(productId: string): Promise<Product[]> {
    console.log("Récupération du produit avec ID:", productId);
    const { data, error } = await supabase
    .from("products")
    .select(`
      product,
      name,
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

  const product = data.map((item) => ({
    productId: item.product,
    name: item.name,
    ean: item.ean,
    qty: item.qty,
    unit: item.unit,
    created_at: item.created_at
  }));
  console.log("Produit récupéré:", product);
  return product;
}

export async function getProductByEan(ean: string): Promise<Product[]> {
    const { data, error } = await supabase
    .from("products")
    .select(`
      product,
      name,
      ean,
      qty,
      unit,
      created_at
    `)
    .eq("ean", ean);

  if (error) {
    console.error("Erreur récupération stocks:", error);
    throw new Error("Impossible de récupérer les stocks");
  }

  if (!data) return [];
  
  return data.map((item) => ({
    productId: item.product,
    name: item.name,
    ean: item.ean,
    qty: item.qty,
    unit: item.unit,
    created_at: item.created_at
  }));
}