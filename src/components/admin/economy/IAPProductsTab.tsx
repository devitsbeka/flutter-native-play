import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { useIAPProductsAdmin, IAPProduct } from "@/hooks/useShopProducts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * What the app charges for real money — read only, and labelled as a mirror.
 *
 * This used to be a full CRUD editor over `iap_products`, and every part of
 * that was misleading:
 *
 *   - The rows were WRONG. They said $0.80 / $3.20 / $8.00 / $24.00 and
 *     2.00 / 8.00 / 20.00 / 60.00 GEL against a live charge of $0.99 / $3.99 /
 *     $10.99 / $34.99 and 1.24 / 4.99 / 13.74 / 43.74 — seeded once in
 *     20260119190510 and never touched again. They also carried
 *     `bonus_percentage` 20 and 40 on the two large packs, which no pack has
 *     had since the bonuses went to zero. So this was the screen you would
 *     open to answer "what do we charge for gems", and it was wrong on every
 *     row.
 *
 *   - Editing them changed NOTHING. The web checkout charges from
 *     `_shared/pricing.ts` and the App Store charges from the tier configured
 *     in App Store Connect. Nothing reads this table but this screen.
 *
 * A wrong number you can edit reads as the number in force. So the rows are
 * reseeded from the real price table (20261104120000) and the inputs are gone:
 * changing a price means changing src/config/pricing.ts, its mirror in
 * _shared/pricing.ts, and the App Store Connect tier — and
 * src/__tests__/repo-invariants.test.ts fails if the first two disagree.
 */
export function IAPProductsTab() {
  const { products, isLoading, refetch } = useIAPProductsAdmin();

  const gemProducts = products.filter((p: IAPProduct) => !p.is_subscription);
  const subscriptions = products.filter((p: IAPProduct) => p.is_subscription);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rows = (list: IAPProduct[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Price USD</TableHead>
          <TableHead>Price GEL</TableHead>
          <TableHead>Grants</TableHead>
          <TableHead>Active</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((product) => (
          <TableRow key={product.id}>
            <TableCell className="font-mono text-xs">{product.id}</TableCell>
            <TableCell>{product.name}</TableCell>
            <TableCell>{product.price_usd != null ? `$${product.price_usd}` : "—"}</TableCell>
            <TableCell>{product.price_gel != null ? `${product.price_gel} ₾` : "—"}</TableCell>
            <TableCell>
              {product.gems_value ? `${product.gems_value.toLocaleString()} 💎` : "—"}
            </TableCell>
            <TableCell>
              <Badge variant={product.is_active ? "default" : "outline"}>
                {product.is_active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">In-App Purchases</h3>
          <p className="text-sm text-muted-foreground">
            What the app charges for real money
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Say it on the screen, not only in the source. Somebody opening this
          tab to change a price needs to know before they look for the input. */}
      <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium">This table is a mirror. Editing it changes no price.</p>
          <p className="text-muted-foreground">
            The web checkout charges from <code>src/config/pricing.ts</code> (mirrored in{" "}
            <code>supabase/functions/_shared/pricing.ts</code>); the App Store charges the
            tier set in App Store Connect. Changing a price means changing all
            three.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            💎 Gem Packs
            <Badge variant="secondary">{gemProducts.length}</Badge>
          </CardTitle>
          <CardDescription>One-time gem purchases</CardDescription>
        </CardHeader>
        <CardContent>{rows(gemProducts)}</CardContent>
      </Card>

      {subscriptions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              👑 Subscriptions
              <Badge variant="secondary">{subscriptions.length}</Badge>
            </CardTitle>
            <CardDescription>Recurring PRO plans</CardDescription>
          </CardHeader>
          <CardContent>{rows(subscriptions)}</CardContent>
        </Card>
      )}
    </div>
  );
}
