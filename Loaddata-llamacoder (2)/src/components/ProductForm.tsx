import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Category } from "@/App";

type ProductFormProps = {
  categories: Category[];
  onAdd: (name: string, price: number, categoryId: string) => void;
};

export function ProductForm({ categories, onAdd }: ProductFormProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !categoryId) return;
    onAdd(name, parseInt(price, 10), categoryId);
    setName("");
    setPrice("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">商品名稱</Label>
        <Input
          id="name"
          placeholder="例如：大壽金"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="price">商品價格 (NT$)</Label>
        <Input
          id="price"
          type="number"
          placeholder="例如：150"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          min="0"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">商品分類</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id="category">
            <SelectValue placeholder="選擇分類" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full bg-amber-700 text-amber-50 hover:bg-amber-800">
        新增商品
      </Button>
    </form>
  );
}