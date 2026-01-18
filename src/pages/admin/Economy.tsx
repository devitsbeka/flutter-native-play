import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Package, CreditCard, BarChart3, Heart } from "lucide-react";
import { EconomyConfigTab } from "@/components/admin/economy/EconomyConfigTab";
import { ShopProductsTab } from "@/components/admin/economy/ShopProductsTab";
import { IAPProductsTab } from "@/components/admin/economy/IAPProductsTab";
import { RevenueAnalyticsTab } from "@/components/admin/economy/RevenueAnalyticsTab";
import { EconomyHealthTab } from "@/components/admin/economy/EconomyHealthTab";

export default function Economy() {
  const [activeTab, setActiveTab] = useState("config");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Economy & Monetization</h1>
        <p className="text-muted-foreground">
          Manage game economy, shop products, and view analytics
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Coins className="w-4 h-4" />
            <span className="hidden sm:inline">Economy</span>
          </TabsTrigger>
          <TabsTrigger value="shop" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span className="hidden sm:inline">Shop</span>
          </TabsTrigger>
          <TabsTrigger value="iap" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <span className="hidden sm:inline">IAP</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Health</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <EconomyConfigTab />
        </TabsContent>

        <TabsContent value="shop">
          <ShopProductsTab />
        </TabsContent>

        <TabsContent value="iap">
          <IAPProductsTab />
        </TabsContent>

        <TabsContent value="analytics">
          <RevenueAnalyticsTab />
        </TabsContent>

        <TabsContent value="health">
          <EconomyHealthTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
