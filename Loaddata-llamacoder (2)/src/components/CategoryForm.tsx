import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CategoryFormProps = {
  onAdd: (name: string) => void;
};

export function CategoryForm({ onAdd }: CategoryFormProps) {
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onAdd(name);
    setName("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="cat-name">分類名稱</Label>
        <Input
          id="cat-name"
          placeholder="例如：壽金"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <Button type="submit" size="sm" className="w-full bg-stone-800 text-amber-50 hover:bg-stone-700">
        新增分類
      </Button>
    </form>
  );
}