import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Lock, Cloud, Smartphone, FileSearch } from "lucide-react";

export type Product = "intune" | "entra" | "defender" | "azure" | "purview";

interface ProductSelectorProps {
  selectedProduct: Product;
  onProductChange: (product: Product) => void;
}

const products = [
  { value: "intune" as Product, label: "Intune", icon: Smartphone },
  { value: "entra" as Product, label: "Entra", icon: Lock },
  { value: "defender" as Product, label: "Defender", icon: Shield },
  { value: "azure" as Product, label: "Azure", icon: Cloud },
  { value: "purview" as Product, label: "Purview", icon: FileSearch },
];

export const ProductSelector = ({ selectedProduct, onProductChange }: ProductSelectorProps) => {
  const SelectedIcon = products.find(p => p.value === selectedProduct)?.icon || Smartphone;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Product:</span>
      <Select value={selectedProduct} onValueChange={onProductChange}>
        <SelectTrigger className="w-[180px] bg-background border-border">
          <div className="flex items-center gap-2">
            <SelectedIcon className="h-4 w-4" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent>
          {products.map((product) => {
            const Icon = product.icon;
            return (
              <SelectItem key={product.value} value={product.value}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{product.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};
