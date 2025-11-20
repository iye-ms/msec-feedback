import type { Product } from "@/components/ProductSelector";

export const useProductFilter = (selectedProduct: Product) => {
  return { product: selectedProduct };
};
