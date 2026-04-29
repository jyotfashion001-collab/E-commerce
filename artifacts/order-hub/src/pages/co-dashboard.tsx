import {
  useGetAllCompaniesSummary,
  useGetAllCompaniesPlatformSummary,
  useGetAllCompaniesPurchaseSummary,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/utils";
import { useBrand } from "@/lib/use-brand";
import {
  Building2,
  TrendingUp,
  ShoppingCart,
  ShoppingBag,
  Package,
  Layers,
} from "lucide-react";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export default function CoDashboard() {
  const { brand, setBrand } = useBrand();
  const { data, isLoading } = useGetAllCompaniesSummary();
  const { data: platformData, isLoading: isPlatformLoading } =
    useGetAllCompaniesPlatformSummary();
  const { data: purchaseData, isLoading: isPurchaseLoading } =
    useGetAllCompaniesPurchaseSummary();

  const totals = data?.totals;
  const items = data?.items ?? [];
  const allPlatforms = platformData?.all;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Co. Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Summary numbers for every company in one place. Click a row to switch
          your active company.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          icon={<Building2 className="h-5 w-5 text-primary" />}
          label="Companies"
          value={isLoading ? null : items.length.toString()}
        />
        <SummaryCard
          icon={<ShoppingBag className="h-5 w-5 text-primary" />}
          label="Product Purchase"
          value={
            isPurchaseLoading || !purchaseData
              ? null
              : INR.format(purchaseData.totalCost)
          }
        />
        <SummaryCard
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          label="Total Revenue"
          value={
            isPlatformLoading || !allPlatforms
              ? null
              : INR.format(
                  allPlatforms.successAmount +
                    allPlatforms.pendingAmount +
                    (allPlatforms.successAmount + allPlatforms.pendingAmount) +
                    allPlatforms.rtoAmount +
                    allPlatforms.returnAmount,
                )
          }
        />
        <SummaryCard
          icon={<ShoppingCart className="h-5 w-5 text-primary" />}
          label="Total Orders"
          value={
            isPlatformLoading || !allPlatforms
              ? null
              : allPlatforms.totalOrders.toString()
          }
        />
        <SummaryCard
          icon={<Package className="h-5 w-5 text-primary" />}
          label="Inventory Units"
          value={isLoading ? null : (totals?.inventoryUnits ?? 0).toString()}
        />
        <SummaryCard
          icon={<Layers className="h-5 w-5 text-primary" />}
          label="Stock"
          value={
            isLoading || isPlatformLoading || !allPlatforms
              ? null
              : (
                  (totals?.inventoryUnits ?? 0) - allPlatforms.totalOrders
                ).toString()
          }
        />
      </div>

      <div className="space-y-3">
        <Badge
          variant="outline"
          className="border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
        >
          All Platforms
        </Badge>

        {isPlatformLoading || !allPlatforms ? (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[88px] w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardHeader className="pb-1.5 space-y-0.5">
                <CardDescription className="text-xs">
                  Total Payment Success
                </CardDescription>
                <CardTitle className="text-lg font-semibold tabular-nums truncate text-emerald-700">
                  {INR.format(allPlatforms.successAmount)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground truncate">
                {allPlatforms.successCount} order
                {allPlatforms.successCount === 1 ? "" : "s"} settled
              </CardContent>
            </Card>
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-1.5 space-y-0.5">
                <CardDescription className="text-xs">
                  Total Payment Pending
                </CardDescription>
                <CardTitle className="text-lg font-semibold tabular-nums truncate text-amber-700">
                  {INR.format(allPlatforms.pendingAmount)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground truncate">
                {allPlatforms.pendingCount} order
                {allPlatforms.pendingCount === 1 ? "" : "s"} awaiting
              </CardContent>
            </Card>
            <Card className="border-indigo-500/30 bg-indigo-500/5">
              <CardHeader className="pb-1.5 space-y-0.5">
                <CardDescription className="text-xs">
                  Settlement
                </CardDescription>
                <CardTitle className="text-lg font-semibold tabular-nums truncate text-indigo-700">
                  {INR.format(
                    allPlatforms.successAmount + allPlatforms.pendingAmount,
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground truncate">
                Success + Pending combined
              </CardContent>
            </Card>
            <Card className="border-rose-500/30 bg-rose-500/5">
              <CardHeader className="pb-1.5 space-y-0.5">
                <CardDescription className="text-xs">
                  RTO Product Amount
                </CardDescription>
                <CardTitle className="text-lg font-semibold tabular-nums truncate text-rose-700">
                  {INR.format(allPlatforms.rtoAmount)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground truncate">
                {allPlatforms.rtoCount} order
                {allPlatforms.rtoCount === 1 ? "" : "s"} to origin
              </CardContent>
            </Card>
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardHeader className="pb-1.5 space-y-0.5">
                <CardDescription className="text-xs">
                  Return Product Amount
                </CardDescription>
                <CardTitle className="text-lg font-semibold tabular-nums truncate text-orange-700">
                  {INR.format(allPlatforms.returnAmount)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground truncate">
                {allPlatforms.returnCount} customer return
                {allPlatforms.returnCount === 1 ? "" : "s"}
              </CardContent>
            </Card>
            <Card className="border-rose-500/30 bg-rose-500/5">
              <CardHeader className="pb-1.5 space-y-0.5">
                <CardDescription className="text-xs">
                  Return Charge
                </CardDescription>
                <CardTitle
                  className={`text-lg font-semibold tabular-nums truncate ${
                    (allPlatforms.returnSettlement ?? 0) < 0
                      ? "text-rose-700"
                      : "text-foreground"
                  }`}
                >
                  {INR.format(allPlatforms.returnSettlement ?? 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground truncate">
                {allPlatforms.returnCount} return order
                {allPlatforms.returnCount === 1 ? "" : "s"} deducted
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1.5 space-y-0.5">
                <CardDescription className="text-xs">
                  Comp / Claims / Recovery
                </CardDescription>
                <CardTitle className="text-lg font-semibold tabular-nums truncate">
                  {INR.format(
                    allPlatforms.compensation +
                      allPlatforms.claims +
                      allPlatforms.recovery,
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground truncate">
                Comp + Claims + Recovery
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Companies</CardTitle>
          <CardDescription>
            One row per company workspace, with their key totals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No companies yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                    <TableHead className="text-right">In Stock</TableHead>
                    <TableHead className="text-right">SKUs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c) => {
                    const isActive = c.slug === brand;
                    return (
                      <TableRow
                        key={c.slug}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setBrand(c.slug)}
                        data-testid={`row-company-${c.slug}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">
                                  {c.name}
                                </span>
                                {isActive && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs font-mono text-muted-foreground truncate">
                                {c.slug}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          {formatINR(c.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.totalOrders}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.totalUnits}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.inventoryUnits}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.distinctSkus}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              {label}
            </div>
            {value === null ? (
              <Skeleton className="h-6 w-24 mt-1" />
            ) : (
              <div className="text-xl font-bold tabular-nums truncate">
                {value}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// silence unused-import warning when icons get added/removed
void Layers;
