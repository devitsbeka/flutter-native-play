import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ShopProduct {
  id: string;
  name_key: string;
  description_key: string | null;
  category: string;
  price: number;
  currency: string;
  value: unknown | null;
  is_active: boolean;
  is_featured: boolean;
  is_popular: boolean;
  badge: string | null;
  sort_order: number;
  gradient: string | null;
  icon_url: string | null;
  original_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface IAPProduct {
  id: string;
  name: string;
  description: string | null;
  price_usd: number;
  gems_value: number | null;
  coins_value: number | null;
  is_subscription: boolean;
  subscription_duration_days: number | null;
  is_active: boolean;
  platform: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useShopProducts(category?: string) {
  const { data: products = [], isLoading, error, refetch } = useQuery({
    queryKey: ["shop-products", category],
    queryFn: async () => {
      let query = supabase
        .from("shop_products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      
      if (category) {
        query = query.eq("category", category);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ShopProduct[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    products,
    isLoading,
    error,
    refetch,
  };
}

export function useShopProductsAdmin() {
  const queryClient = useQueryClient();

  const { data: products = [], isLoading, error, refetch } = useQuery({
    queryKey: ["shop-products-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("*")
        .order("category")
        .order("sort_order");
      
      if (error) throw error;
      return data as ShopProduct[];
    },
  });

  const updateProduct = useMutation({
    mutationFn: async (product: Partial<ShopProduct> & { id: string }) => {
      const { id, ...updates } = product;
      const { error } = await supabase
        .from("shop_products")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
      queryClient.invalidateQueries({ queryKey: ["shop-products-admin"] });
    },
  });

  const createProduct = useMutation({
    mutationFn: async (product: Omit<ShopProduct, "created_at" | "updated_at">) => {
      const { error } = await supabase
        .from("shop_products")
        .insert([product]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
      queryClient.invalidateQueries({ queryKey: ["shop-products-admin"] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shop_products")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-products"] });
      queryClient.invalidateQueries({ queryKey: ["shop-products-admin"] });
    },
  });

  // Group by category
  const groupedProducts = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, ShopProduct[]>);

  return {
    products,
    groupedProducts,
    isLoading,
    error,
    refetch,
    updateProduct: updateProduct.mutate,
    createProduct: createProduct.mutate,
    deleteProduct: deleteProduct.mutate,
    isUpdating: updateProduct.isPending,
  };
}

export function useIAPProducts() {
  const { data: products = [], isLoading, error, refetch } = useQuery({
    queryKey: ["iap-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("iap_products")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      
      if (error) throw error;
      return data as IAPProduct[];
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    products,
    isLoading,
    error,
    refetch,
  };
}

export function useIAPProductsAdmin() {
  const queryClient = useQueryClient();

  const { data: products = [], isLoading, error, refetch } = useQuery({
    queryKey: ["iap-products-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("iap_products")
        .select("*")
        .order("sort_order");
      
      if (error) throw error;
      return data as IAPProduct[];
    },
  });

  const updateProduct = useMutation({
    mutationFn: async (product: Partial<IAPProduct> & { id: string }) => {
      const { error } = await supabase
        .from("iap_products")
        .update({ ...product, updated_at: new Date().toISOString() })
        .eq("id", product.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iap-products"] });
      queryClient.invalidateQueries({ queryKey: ["iap-products-admin"] });
    },
  });

  const createProduct = useMutation({
    mutationFn: async (product: Omit<IAPProduct, "created_at" | "updated_at">) => {
      const { error } = await supabase
        .from("iap_products")
        .insert(product);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["iap-products"] });
      queryClient.invalidateQueries({ queryKey: ["iap-products-admin"] });
    },
  });

  return {
    products,
    isLoading,
    error,
    refetch,
    updateProduct: updateProduct.mutate,
    createProduct: createProduct.mutate,
    isUpdating: updateProduct.isPending,
  };
}
