import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, Plus, Trash2, Save } from "lucide-react";
import { useShopProductsAdmin, ShopProduct } from "@/hooks/useShopProducts";
import { toast } from "@/lib/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORY_OPTIONS = [
  { value: "coins", label: "💰 Coins" },
  { value: "powerup", label: "⚡ Power-ups" },
  { value: "vip", label: "👑 VIP" },
  { value: "bundle", label: "🎁 Bundles" },
  { value: "frame", label: "🖼️ Frames" },
];

const CURRENCY_OPTIONS = [
  { value: "gems", label: "💎 Gems" },
  { value: "coins", label: "💰 Coins" },
  { value: "usd", label: "💵 USD" },
];

export function ShopProductsTab() {
  const { products, groupedProducts, isLoading, refetch, updateProduct, createProduct, deleteProduct, isUpdating } = useShopProductsAdmin();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedProduct, setEditedProduct] = useState<Partial<ShopProduct>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<ShopProduct>>({
    category: "coins",
    currency: "gems",
    is_active: true,
    is_featured: false,
    is_popular: false,
    sort_order: 0,
  });

  const handleEdit = (product: ShopProduct) => {
    setEditingId(product.id);
    setEditedProduct({ ...product });
  };

  const handleSave = () => {
    if (!editingId || !editedProduct) return;
    
    updateProduct({ id: editingId, ...editedProduct });
    toast.success("Product updated");
    setEditingId(null);
    setEditedProduct({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedProduct({});
  };

  const handleToggleActive = (product: ShopProduct) => {
    updateProduct({ id: product.id, is_active: !product.is_active });
    toast.success(`Product ${product.is_active ? "disabled" : "enabled"}`);
  };

  const handleToggleFeatured = (product: ShopProduct) => {
    updateProduct({ id: product.id, is_featured: !product.is_featured });
  };

  const handleTogglePopular = (product: ShopProduct) => {
    updateProduct({ id: product.id, is_popular: !product.is_popular });
  };

  const handleDelete = (product: ShopProduct) => {
    if (confirm(`Delete "${product.id}"?`)) {
      deleteProduct(product.id);
      toast.success("Product deleted");
    }
  };

  const handleAddProduct = () => {
    if (!newProduct.id || !newProduct.name_key || !newProduct.price) {
      toast.error("Fill in required fields");
      return;
    }

    createProduct(newProduct as Omit<ShopProduct, "created_at" | "updated_at">);
    toast.success("Product created");
    setIsAddDialogOpen(false);
    setNewProduct({
      category: "coins",
      currency: "gems",
      is_active: true,
      is_featured: false,
      is_popular: false,
      sort_order: 0,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage shop products. Changes apply instantly.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>Create a new shop product</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>ID *</Label>
                    <Input
                      placeholder="coins_mega"
                      value={newProduct.id || ""}
                      onChange={(e) => setNewProduct({ ...newProduct, id: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Name Key *</Label>
                    <Input
                      placeholder="shop.coinsMega"
                      value={newProduct.name_key || ""}
                      onChange={(e) => setNewProduct({ ...newProduct, name_key: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={newProduct.category}
                      onValueChange={(v) => setNewProduct({ ...newProduct, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Select
                      value={newProduct.currency}
                      onValueChange={(v) => setNewProduct({ ...newProduct, currency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price *</Label>
                    <Input
                      type="number"
                      placeholder="50"
                      value={newProduct.price || ""}
                      onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Sort Order</Label>
                    <Input
                      type="number"
                      value={newProduct.sort_order || 0}
                      onChange={(e) => setNewProduct({ ...newProduct, sort_order: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Value (JSON)</Label>
                  <Input
                    placeholder='{"coins": 1000}'
                    onChange={(e) => {
                      try {
                        setNewProduct({ ...newProduct, value: JSON.parse(e.target.value) });
                      } catch {
                        // Invalid JSON, ignore
                      }
                    }}
                  />
                </div>
                <Button onClick={handleAddProduct} className="w-full">
                  Create Product
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg capitalize flex items-center gap-2">
              {CATEGORY_OPTIONS.find((c) => c.value === category)?.label || category}
              <Badge variant="secondary">{categoryProducts.length}</Badge>
            </CardTitle>
            <CardDescription>
              Products in this category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name Key</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Popular</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-xs">
                      {editingId === product.id ? (
                        <Input
                          value={editedProduct.id || ""}
                          disabled
                          className="h-8"
                        />
                      ) : (
                        product.id
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === product.id ? (
                        <Input
                          value={editedProduct.name_key || ""}
                          onChange={(e) => setEditedProduct({ ...editedProduct, name_key: e.target.value })}
                          className="h-8"
                        />
                      ) : (
                        product.name_key
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === product.id ? (
                        <Input
                          type="number"
                          value={editedProduct.price || ""}
                          onChange={(e) => setEditedProduct({ ...editedProduct, price: parseFloat(e.target.value) })}
                          className="h-8 w-20"
                        />
                      ) : (
                        product.price
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{product.currency}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={product.is_active}
                        onCheckedChange={() => handleToggleActive(product)}
                        disabled={isUpdating}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={product.is_featured}
                        onCheckedChange={() => handleToggleFeatured(product)}
                        disabled={isUpdating}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={product.is_popular}
                        onCheckedChange={() => handleTogglePopular(product)}
                        disabled={isUpdating}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {editingId === product.id ? (
                          <>
                            <Button size="sm" variant="ghost" onClick={handleSave}>
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancel}>
                              ✕
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(product)}>
                              ✏️
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(product)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
