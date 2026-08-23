import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, RefreshCw, Plus, Save } from "lucide-react";
import { useIAPProductsAdmin, IAPProduct } from "@/hooks/useShopProducts";
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

export function IAPProductsTab() {
  const { products, isLoading, refetch, updateProduct, createProduct, isUpdating } = useIAPProductsAdmin();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedProduct, setEditedProduct] = useState<Partial<IAPProduct>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<IAPProduct>>({
    platform: "both",
    is_subscription: false,
    is_active: true,
    sort_order: 0,
  });

  const handleEdit = (product: IAPProduct) => {
    setEditingId(product.id);
    setEditedProduct({ ...product });
  };

  const handleSave = () => {
    if (!editingId || !editedProduct) return;
    
    updateProduct({ id: editingId, ...editedProduct });
    toast.success("IAP Product updated");
    setEditingId(null);
    setEditedProduct({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedProduct({});
  };

  const handleToggleActive = (product: IAPProduct) => {
    updateProduct({ id: product.id, is_active: !product.is_active });
    toast.success(`Product ${product.is_active ? "disabled" : "enabled"}`);
  };

  const handleAddProduct = () => {
    if (!newProduct.id || !newProduct.name || !newProduct.price_usd) {
      toast.error("Fill in required fields");
      return;
    }

    createProduct(newProduct as Omit<IAPProduct, "created_at" | "updated_at">);
    toast.success("IAP Product created");
    setIsAddDialogOpen(false);
    setNewProduct({
      platform: "both",
      is_subscription: false,
      is_active: true,
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

  const gemProducts = products.filter((p) => !p.is_subscription);
  const subscriptionProducts = products.filter((p) => p.is_subscription);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Manage real-money in-app purchases (App Store / Play Store).
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
                Add IAP
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add IAP Product</DialogTitle>
                <DialogDescription>Create a new in-app purchase product</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Product ID *</Label>
                    <Input
                      placeholder="gems_ultra"
                      value={newProduct.id || ""}
                      onChange={(e) => setNewProduct({ ...newProduct, id: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Name *</Label>
                    <Input
                      placeholder="Ultra Gem Pack"
                      value={newProduct.name || ""}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    placeholder="2000 Gems + 500 Bonus"
                    value={newProduct.description || ""}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Price USD *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="29.99"
                      value={newProduct.price_usd || ""}
                      onChange={(e) => setNewProduct({ ...newProduct, price_usd: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Gems Value</Label>
                    <Input
                      type="number"
                      placeholder="2500"
                      value={newProduct.gems_value || ""}
                      onChange={(e) => setNewProduct({ ...newProduct, gems_value: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Coins Value</Label>
                    <Input
                      type="number"
                      placeholder=""
                      value={newProduct.coins_value || ""}
                      onChange={(e) => setNewProduct({ ...newProduct, coins_value: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Platform</Label>
                    <Select
                      value={newProduct.platform}
                      onValueChange={(v) => setNewProduct({ ...newProduct, platform: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Both</SelectItem>
                        <SelectItem value="ios">iOS Only</SelectItem>
                        <SelectItem value="android">Android Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch
                      checked={newProduct.is_subscription}
                      onCheckedChange={(v) => setNewProduct({ ...newProduct, is_subscription: v })}
                    />
                    <Label>Is Subscription</Label>
                  </div>
                </div>
                {newProduct.is_subscription && (
                  <div>
                    <Label>Duration (days)</Label>
                    <Input
                      type="number"
                      placeholder="30"
                      value={newProduct.subscription_duration_days || ""}
                      onChange={(e) => setNewProduct({ ...newProduct, subscription_duration_days: parseInt(e.target.value) })}
                    />
                  </div>
                )}
                <Button onClick={handleAddProduct} className="w-full">
                  Create IAP Product
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Gem Packs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            💎 Gem Packs
            <Badge variant="secondary">{gemProducts.length}</Badge>
          </CardTitle>
          <CardDescription>One-time gem purchases</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price USD</TableHead>
                <TableHead>Gems</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gemProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-xs">{product.id}</TableCell>
                  <TableCell>
                    {editingId === product.id ? (
                      <Input
                        value={editedProduct.name || ""}
                        onChange={(e) => setEditedProduct({ ...editedProduct, name: e.target.value })}
                        className="h-8"
                      />
                    ) : (
                      product.name
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === product.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editedProduct.price_usd || ""}
                        onChange={(e) => setEditedProduct({ ...editedProduct, price_usd: parseFloat(e.target.value) })}
                        className="h-8 w-20"
                      />
                    ) : (
                      `$${product.price_usd}`
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === product.id ? (
                      <Input
                        type="number"
                        value={editedProduct.gems_value || ""}
                        onChange={(e) => setEditedProduct({ ...editedProduct, gems_value: parseInt(e.target.value) })}
                        className="h-8 w-20"
                      />
                    ) : (
                      product.gems_value?.toLocaleString()
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.platform}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.is_active}
                      onCheckedChange={() => handleToggleActive(product)}
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
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(product)}>
                          ✏️
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Subscriptions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            👑 Subscriptions
            <Badge variant="secondary">{subscriptionProducts.length}</Badge>
          </CardTitle>
          <CardDescription>VIP and premium subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Price USD</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptionProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-xs">{product.id}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>${product.price_usd}</TableCell>
                  <TableCell>{product.subscription_duration_days} days</TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.platform}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.is_active}
                      onCheckedChange={() => handleToggleActive(product)}
                      disabled={isUpdating}
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(product)}>
                      ✏️
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
