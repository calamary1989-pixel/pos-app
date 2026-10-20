import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  ShoppingCart,
  Receipt,
  LayoutGrid,
  Settings,
  Banknote,
  X,
  PackagePlus,
  FolderPlus,
  Package,
  Folder,
  Search,
  Calculator,
  Delete,
  Database,
  Download,
  Upload,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type Product = {
  id: string;
  name: string;
  price: number;
  categoryId: string;
};

export type Category = {
  id: string;
  name: string;
  order: number;
};

export type CartItem = {
  product: Product;
  quantity: number;
};

export type Transaction = {
  id: string;
  items: { name: string; price: number; quantity: number }[];
  total: number;
  timestamp: number;
};

const STORAGE_KEY = "jin-zi-pos-data-v1";

const defaultCategories: Category[] = [
  { id: "c1", name: "壽金", order: 0 },
  { id: "c2", name: "刈金", order: 1 },
  { id: "c3", name: "銀紙", order: 2 },
  { id: "c4", name: "紙紮", order: 3 },
];

const defaultProducts: Product[] = [
  { id: "p1", name: "大壽金", price: 150, categoryId: "c1" },
  { id: "p2", name: "中壽金", price: 100, categoryId: "c1" },
  { id: "p3", name: "刈金 (大)", price: 80, categoryId: "c2" },
  { id: "p4", name: "刈金 (小)", price: 50, categoryId: "c2" },
  { id: "p5", name: "四方金", price: 60, categoryId: "c2" },
  { id: "p6", name: "大銀", price: 120, categoryId: "c3" },
  { id: "p7", name: "小銀", price: 40, categoryId: "c3" },
  { id: "p8", name: "金童玉女", price: 500, categoryId: "c4" },
  { id: "p9", name: "豪華別墅", price: 1500, categoryId: "c4" },
];

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        categories: parsed.categories || defaultCategories,
        products: parsed.products || defaultProducts,
        transactions: parsed.transactions || [],
      };
    }
  } catch (e) {
    console.error("Failed to load data", e);
  }
  return {
    categories: defaultCategories,
    products: defaultProducts,
    transactions: [] as Transaction[],
  };
}

// --- 子元件：商品新增表單 ---
type ProductFormProps = {
  categories: Category[];
  onAdd: (name: string, price: number, categoryId: string) => void;
};

function ProductForm({ categories, onAdd }: ProductFormProps) {
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

// --- 子元件：分類新增表單 ---
type CategoryFormProps = {
  onAdd: (name: string) => void;
};

function CategoryForm({ onAdd }: CategoryFormProps) {
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

// --- 主元件 ---
export default function App() {
  const [view, setView] = useState<"pos" | "transactions" | "management" | "system">("pos");
  const [data, setData] = useState(loadData);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [isNumpadOpen, setIsNumpadOpen] = useState(false);
  const [numpadValue, setNumpadValue] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save data", e);
      toast.error("資料儲存失敗，可能空間不足");
    }
  }, [data]);

  const sortedCategories = [...data.categories].sort((a, b) => a.order - b.order);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckoutClick = () => {
    if (cart.length === 0) {
      toast.error("購物車是空的");
      return;
    }
    setPaidAmount(cartTotal);
    setIsCheckoutOpen(true);
  };

  const openNumpad = () => {
    setNumpadValue("");
    setIsNumpadOpen(true);
  };

  const handleNumpadInput = (key: string) => {
    if (key === "del") {
      setNumpadValue((prev) => prev.slice(0, -1));
    } else if (key === "clear") {
      setNumpadValue("");
    } else {
      if (numpadValue.length < 8) {
        setNumpadValue((prev) => (prev === "0" ? key : prev + key));
      }
    }
  };

  const confirmNumpad = () => {
    setPaidAmount(parseInt(numpadValue, 10) || 0);
    setIsNumpadOpen(false);
  };

  const confirmCheckout = () => {
    if (paidAmount < cartTotal) {
      toast.error("實收金額不足");
      return;
    }

    const transaction: Transaction = {
      id: `t${Date.now()}`,
      items: cart.map((item) => ({
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      })),
      total: cartTotal,
      timestamp: Date.now(),
    };
    
    setData((prev) => ({ ...prev, transactions: [transaction, ...prev.transactions] }));
    setCart([]);
    setIsCheckoutOpen(false);
    
    const change = paidAmount - cartTotal;
    toast.success("結帳成功！", {
      description: `找零 NT$ ${change.toLocaleString()}`,
    });
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTransactions = data.transactions.filter((t) => t.timestamp >= today.getTime());
  const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.total, 0);

  const moveCategory = (id: string, direction: "up" | "down") => {
    setData((prev) => {
      const sorted = [...prev.categories].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((c) => c.id === id);
      if (index < 0) return prev;
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= sorted.length) return prev;
      const newCategories = [...sorted];
      const tempOrder = newCategories[index].order;
      newCategories[index].order = newCategories[swapIndex].order;
      newCategories[swapIndex].order = tempOrder;
      return { ...prev, categories: newCategories };
    });
  };

  const addCategory = (name: string) => {
    const newCat: Category = {
      id: `c${Date.now()}`,
      name,
      order: data.categories.length,
    };
    setData((prev) => ({ ...prev, categories: [...prev.categories, newCat] }));
    toast.success("分類已新增");
  };

  const deleteCategory = (id: string) => {
    const hasProducts = data.products.some((p) => p.categoryId === id);
    if (hasProducts) {
      toast.error("此分類下還有商品，無法刪除");
      return;
    }
    setData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
    }));
    toast.success("分類已刪除");
  };

  const addProduct = (name: string, price: number, categoryId: string) => {
    const newProduct: Product = {
      id: `p${Date.now()}`,
      name,
      price,
      categoryId,
    };
    setData((prev) => ({ ...prev, products: [...prev.products, newProduct] }));
    toast.success("商品已新增");
    setIsProductDialogOpen(false);
  };

  const deleteProduct = (id: string) => {
    setData((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
    toast.success("商品已刪除");
  };

  const filteredProducts = data.products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.categoryId === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const changeAmount = paidAmount - cartTotal;

  const handleBackup = () => {
    try {
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `jin-zi-pos-backup-${new Date().toISOString().split("T")[0]}.json`;
      link.style.display = "none";
      link.rel = "noopener";
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast.success("備份檔案已成功下載！", {
        description: "請至你的瀏覽器下載資料夾查看儲存的 .json 檔案。"
      });
    } catch (error) {
      console.error("Backup failed", error);
      toast.error("備份下載失敗，請重試");
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const restoredData = JSON.parse(event.target?.result as string);
        if (restoredData.products && restoredData.categories && restoredData.transactions) {
          setData(restoredData);
          toast.success("資料還原成功");
        } else {
          toast.error("還原失敗：檔案格式不正確");
        }
      } catch (error) {
        toast.error("還原失敗：檔案格式錯誤");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex h-screen flex-col bg-amber-50/40 text-stone-800">
      <Toaster richColors position="top-center" />
      
      <header className="z-30 shrink-0 border-b border-amber-900/10 bg-stone-50/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-700 to-red-800 text-amber-50 shadow-md">
              <span className="font-serif text-xl font-bold">金</span>
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold tracking-wide text-stone-800">
                名雲金香舖
              </h1>
              <p className="text-xs text-stone-500">POS 結帳系統</p>
            </div>
          </div>
          
          <nav className="flex items-center gap-1 rounded-xl bg-stone-200/60 p-1">
            <Button
              variant={view === "pos" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("pos")}
              className={cn(
                view === "pos" && "bg-stone-800 text-stone-50 hover:bg-stone-700"
              )}
            >
              <LayoutGrid className="mr-1.5 h-4 w-4" />
              結帳
            </Button>
            <Button
              variant={view === "transactions" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("transactions")}
              className={cn(
                view === "transactions" && "bg-stone-800 text-stone-50 hover:bg-stone-700"
              )}
            >
              <Receipt className="mr-1.5 h-4 w-4" />
              交易紀錄
            </Button>
            <Button
              variant={view === "management" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("management")}
              className={cn(
                view === "management" && "bg-stone-800 text-stone-50 hover:bg-stone-700"
              )}
            >
              <Settings className="mr-1.5 h-4 w-4" />
              商品管理
            </Button>
            <Button
              variant={view === "system" ? "default" : "ghost"}
              size="sm"
              onClick={() => setView("system")}
              className={cn(
                view === "system" && "bg-stone-800 text-stone-50 hover:bg-stone-700"
              )}
            >
              <Wrench className="mr-1.5 h-4 w-4" />
              系統設定
            </Button>
          </nav>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {view === "pos" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl font-bold text-stone-800">選購商品</h2>
                <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                  {data.products.length} 項商品
                </Badge>
              </div>

              <div className="space-y-6">
                {sortedCategories.map((category) => {
                  const productsInCat = data.products.filter((p) => p.categoryId === category.id);
                  if (productsInCat.length === 0) return null;

                  return (
                    <div key={category.id}>
                      <div className="mb-3 flex items-center gap-3">
                        <h3 className="font-serif text-lg font-semibold text-amber-900">
                          {category.name}
                        </h3>
                        <Separator className="flex-1 bg-amber-200" />
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                        {productsInCat.map((product) => (
                          <div
                            key={product.id}
                            className="group flex cursor-pointer flex-col items-center justify-center rounded-lg border border-stone-200 bg-white p-3 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md"
                            onClick={() => addToCart(product)}
                          >
                            <p className="mb-1 line-clamp-2 text-sm font-semibold text-stone-800">
                              {product.name}
                            </p>
                            <p className="font-serif text-base font-bold text-red-700">
                              NT$ {product.price}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {data.products.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-stone-400">
                    <LayoutGrid className="mb-2 h-10 w-10 opacity-40" />
                    <p className="text-sm">尚無商品，請先至商品管理新增</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "transactions" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Card className="border-amber-200 bg-gradient-to-br from-amber-700 to-red-800 text-amber-50 shadow-md">
                  <CardContent className="p-6">
                    <p className="mb-1 text-sm text-amber-200">本日營收</p>
                    <p className="font-serif text-3xl font-bold">
                      NT$ {todayRevenue.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-stone-200 bg-white shadow-sm">
                  <CardContent className="p-6">
                    <p className="mb-1 text-sm text-stone-500">本日交易次數</p>
                    <p className="font-serif text-3xl font-bold text-stone-800">
                      {todayTransactions.length}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-stone-200 bg-white shadow-sm">
                  <CardContent className="p-6">
                    <p className="mb-1 text-sm text-stone-500">歷史總營收</p>
                    <p className="font-serif text-3xl font-bold text-stone-800">
                      NT$ {data.transactions.reduce((s, t) => s + t.total, 0).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-amber-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="font-serif text-xl">交易紀錄</CardTitle>
                  <CardDescription>所有結帳紀錄一覽</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-stone-400">
                      <Receipt className="mb-2 h-10 w-10 opacity-40" />
                      <p className="text-sm">尚無交易紀錄</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.transactions.map((t) => (
                        <div
                          key={t.id}
                          className="rounded-xl border border-stone-100 bg-stone-50/50 p-4 transition-colors hover:bg-amber-50/40"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800">
                                {new Date(t.timestamp).toLocaleTimeString("zh-TW", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </Badge>
                              <span className="text-xs text-stone-400">
                                {new Date(t.timestamp).toLocaleDateString("zh-TW")}
                              </span>
                            </div>
                            <span className="font-serif text-lg font-bold text-red-700">
                              NT$ {t.total.toLocaleString()}
                            </span>
                          </div>
                          <Separator className="my-2 bg-stone-200" />
                          <div className="flex flex-wrap gap-2">
                            {t.items.map((item, i) => (
                              <span
                                key={i}
                                className="rounded-md bg-white px-2 py-1 text-xs text-stone-600 shadow-sm"
                              >
                                {item.name} × {item.quantity}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {view === "management" && (
            <div className="mx-auto max-w-5xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-800 text-amber-50 shadow-sm">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-stone-800">商品管理系統</h2>
                  <p className="text-sm text-stone-500">管理您的商品分類與項目</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <Card className="border-amber-200 bg-white shadow-sm lg:col-span-2">
                  <CardHeader className="border-b border-stone-100 bg-amber-50/30">
                    <div className="flex items-center gap-2">
                      <Folder className="h-5 w-5 text-amber-700" />
                      <CardTitle className="font-serif text-lg">分類管理</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5">
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/20 p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-amber-900">
                        <FolderPlus className="h-4 w-4" />
                        新增分類
                      </div>
                      <CategoryForm onAdd={addCategory} />
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-stone-400">現有分類 (點擊箭頭調整順序)</p>
                      {sortedCategories.map((cat, index) => (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2.5 shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-stone-800 text-xs font-bold text-amber-50">
                              {index + 1}
                            </span>
                            <span className="font-medium text-stone-700">{cat.name}</span>
                            <Badge variant="secondary" className="bg-stone-100 text-xs text-stone-500">
                              {data.products.filter((p) => p.categoryId === cat.id).length} 項
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 border-stone-200 bg-white p-0 hover:bg-amber-50 disabled:opacity-30"
                              onClick={() => moveCategory(cat.id, "up")}
                              disabled={index === 0}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 border-stone-200 bg-white p-0 hover:bg-amber-50 disabled:opacity-30"
                              onClick={() => moveCategory(cat.id, "down")}
                              disabled={index === sortedCategories.length - 1}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-stone-300 hover:bg-red-50 hover:text-red-600"
                              onClick={() => deleteCategory(cat.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-amber-200 bg-white shadow-sm lg:col-span-3">
                  <CardHeader className="border-b border-stone-100 bg-amber-50/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-amber-700" />
                        <CardTitle className="font-serif text-lg">商品管理</CardTitle>
                      </div>
                      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" className="bg-amber-700 text-amber-50 hover:bg-amber-800">
                            <PackagePlus className="mr-1.5 h-4 w-4" />
                            新增商品
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-serif text-lg">新增商品</DialogTitle>
                          </DialogHeader>
                          <ProductForm categories={sortedCategories} onAdd={addProduct} />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                        <Input
                          placeholder="搜尋商品名稱..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue placeholder="篩選分類" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">所有分類</SelectItem>
                          {sortedCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-stone-400">
                        商品列表 ({filteredProducts.length} / {data.products.length})
                      </p>
                      <div className="max-h-96 overflow-y-auto pr-1">
                        <div className="space-y-2">
                          {filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-stone-400">
                              <Search className="mb-2 h-8 w-8 opacity-40" />
                              <p className="text-sm">找不到符合條件的商品</p>
                            </div>
                          ) : (
                            filteredProducts.map((product) => {
                              const cat = data.categories.find((c) => c.id === product.categoryId);
                              return (
                                <div
                                  key={product.id}
                                  className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                      <Package className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-stone-700">{product.name}</p>
                                      <div className="mt-0.5 flex items-center gap-2">
                                        <span className="text-sm font-bold text-red-700">NT$ {product.price}</span>
                                        {cat && (
                                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-xs text-amber-800">
                                            {cat.name}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-stone-300 hover:bg-red-50 hover:text-red-600"
                                    onClick={() => deleteProduct(product.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {view === "system" && (
            <div className="mx-auto max-w-3xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-800 text-amber-50 shadow-sm">
                  <Wrench className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl font-bold text-stone-800">系統設定</h2>
                  <p className="text-sm text-stone-500">管理系統資料備份與還原</p>
                </div>
              </div>

              <Card className="border-amber-200 bg-white shadow-sm">
                <CardHeader className="border-b border-stone-100 bg-amber-50/30">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-amber-700" />
                    <CardTitle className="font-serif text-lg">資料備份與還原</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                  <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-5">
                    <div className="mb-4 flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-700 text-amber-50 shadow-sm">
                        <Download className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-800">下載系統備份</h3>
                        <p className="mt-1 text-sm text-stone-500">
                          將目前的商品、分類與交易紀錄匯出為 JSON 檔案，請妥善保管以備不時之需。
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleBackup} className="w-full bg-red-700 text-amber-50 hover:bg-red-800">
                      <Download className="mr-2 h-4 w-4" /> 下載備份檔案
                    </Button>
                  </div>

                  <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-5">
                    <div className="mb-4 flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-stone-700 text-amber-50 shadow-sm">
                        <Upload className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-800">還原系統資料</h3>
                        <p className="mt-1 text-sm text-stone-500">
                          選擇先前下載的備份檔案來還原系統資料。注意：還原後將覆蓋目前的資料。
                        </p>
                      </div>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleRestore} />
                    <Button onClick={handleRestoreClick} variant="outline" className="w-full border-stone-300 bg-white text-stone-700 hover:bg-stone-100">
                      <Upload className="mr-2 h-4 w-4" /> 選擇檔案還原
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>

        {view === "pos" && (
          <aside className="hidden w-80 shrink-0 flex-col border-l border-amber-200 bg-white shadow-lg md:flex">
            <div className="shrink-0 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-stone-50 p-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
                  <ShoppingCart className="h-5 w-5 text-amber-700" />
                  購物車
                </h2>
                {cartCount > 0 && (
                  <Badge className="bg-red-700 text-amber-50">{cartCount} 件</Badge>
                )}
              </div>
            </div>
            
            <ScrollArea className="flex-1 px-4">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center py-12 text-stone-400">
                  <ShoppingCart className="mb-2 h-10 w-10 opacity-40" />
                  <p className="text-sm">點擊商品加入購物車</p>
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-stone-700">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-stone-500">
                          NT$ {item.product.price} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 rounded-full p-0"
                          onClick={() => updateQuantity(item.product.id, -1)}
                        >
                          -
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 rounded-full p-0"
                          onClick={() => updateQuantity(item.product.id, 1)}
                        >
                          +
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-10 rounded-full p-0 text-xs font-bold"
                          onClick={() => updateQuantity(item.product.id, 10)}
                        >
                          +10
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-1 h-7 w-7 rounded-full p-0 text-stone-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="shrink-0 border-t border-amber-100 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-stone-500">總計</span>
                <span className="font-serif text-2xl font-bold text-red-700">
                  NT$ {cartTotal.toLocaleString()}
                </span>
              </div>
              <Button
                className="w-full bg-gradient-to-r from-red-700 to-amber-700 text-amber-50 hover:from-red-800 hover:to-amber-800"
                size="lg"
                onClick={handleCheckoutClick}
                disabled={cart.length === 0}
              >
                <Banknote className="mr-2 h-5 w-5" />
                結帳
              </Button>
            </div>
          </aside>
        )}
      </div>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif text-xl">
              <Calculator className="h-5 w-5 text-amber-700" />
              結帳櫃台
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-center">
              <p className="mb-1 text-sm font-medium text-stone-500">應收帳款</p>
              <p className="font-serif text-2xl font-bold text-red-700">
                NT$ {cartTotal.toLocaleString()}
              </p>
            </div>

            <button 
              onClick={openNumpad}
              className="w-full rounded-xl border border-stone-200 bg-white p-4 text-center shadow-sm transition-all hover:border-amber-400 hover:bg-amber-50/30"
            >
              <p className="mb-1 text-sm font-medium text-stone-500">實收帳款</p>
              <p className="font-serif text-2xl font-bold text-stone-800">
                NT$ {paidAmount.toLocaleString()}
              </p>
            </button>

            <div className={cn(
              "rounded-xl border p-4 text-center transition-colors",
              changeAmount >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
            )}>
              <p className="mb-1 text-sm font-medium text-stone-500">找零</p>
              <p className={cn(
                "font-serif text-2xl font-bold",
                changeAmount >= 0 ? "text-emerald-700" : "text-red-700"
              )}>
                NT$ {changeAmount >= 0 ? changeAmount.toLocaleString() : "金額不足"}
              </p>
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-red-700 to-amber-700 text-amber-50 hover:from-red-800 hover:to-amber-800"
              size="lg"
              onClick={confirmCheckout}
              disabled={changeAmount < 0}
            >
              確認結帳
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isNumpadOpen} onOpenChange={setIsNumpadOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center font-serif text-lg">輸入實收金額</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-center">
              <p className="font-serif text-3xl font-bold text-stone-800">
                NT$ {numpadValue ? parseInt(numpadValue, 10).toLocaleString() : 0}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                <Button
                  key={num}
                  variant="outline"
                  className="h-14 border-stone-200 bg-white text-xl font-bold text-stone-800 hover:bg-amber-50"
                  onClick={() => handleNumpadInput(num)}
                >
                  {num}
                </Button>
              ))}
              <Button
                variant="outline"
                className="h-14 border-stone-200 bg-white text-xl font-bold text-stone-400 hover:bg-red-50 hover:text-red-600"
                onClick={() => handleNumpadInput("clear")}
              >
                C
              </Button>
              <Button
                variant="outline"
                className="h-14 border-stone-200 bg-white text-xl font-bold text-stone-800 hover:bg-amber-50"
                onClick={() => handleNumpadInput("0")}
              >
                0
              </Button>
              <Button
                variant="outline"
                className="h-14 border-stone-200 bg-white text-xl font-bold text-stone-400 hover:bg-red-50 hover:text-red-600"
                onClick={() => handleNumpadInput("del")}
              >
                <Delete className="h-5 w-5" />
              </Button>
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-red-700 to-amber-700 text-amber-50 hover:from-red-800 hover:to-amber-800"
              size="lg"
              onClick={confirmNumpad}
            >
              確認
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}