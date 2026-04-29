import { useState, useMemo, useCallback } from "react";
import { useListAccountingProducts } from "@workspace/api-client-react";
import { ProductImage } from "@/components/ui/product-image";
import { formatINR } from "@/lib/utils";
import { DataTablePagination } from "@/components/data-table-pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Layers,
  Search,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from "lucide-react";

const RETURN_STORAGE_KEY = "orderhub_return_orders";

interface StoredReturnRow {
  sku: string;
  qty: string;
}

function loadReturnQtyBySku(): Map<string, number> {
  const map = new Map<string, number>();
  try {
    const raw = localStorage.getItem(RETURN_STORAGE_KEY);
    if (!raw) return map;
    const rows: StoredReturnRow[] = JSON.parse(raw);
    for (const row of rows) {
      const key = (row.sku ?? "").trim().toUpperCase();
      if (!key) continue;
      const qty = parseInt(String(row.qty ?? "0"), 10) || 0;
      map.set(key, (map.get(key) ?? 0) + qty);
    }
  } catch {
    /* ignore */
  }
  return map;
}

const PLATFORM_COLORS: Record<string, string> = {
  meesho: "bg-purple-100 text-purple-700",
  flipkart: "bg-yellow-100 text-yellow-700",
  amazon: "bg-orange-100 text-orange-700",
};

type SortBy = "totalRevenue" | "unitsSold" | "orderCount" | "avgRate" | "productName" | "sku";

export default function Accounting() {
  const [platform, setPlatform] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<SortBy>("totalRevenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const returnQtyMap = useMemo(() => loadReturnQtyBySku(), []);
  const totalReturnQty = useMemo(
    () => Array.from(returnQtyMap.values()).reduce((s, v) => s + v, 0),
    [returnQtyMap]
  );

  const searchTimeout = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    if (searchTimeout[0]) clearTimeout(searchTimeout[0]);
    searchTimeout[1](setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 350));
  }, [searchTimeout]);

  const params = useMemo(() => ({
    platform: platform !== "all" ? platform : undefined,
    search: debouncedSearch || undefined,
    page,
    pageSize,
    sortBy,
    sortOrder,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }), [platform, debouncedSearch, page, pageSize, sortBy, sortOrder, dateFrom, dateTo]);

  const { data, isLoading } = useListAccountingProducts(params);

  const handleSort = (col: SortBy) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const handlePlatformChange = (val: string) => {
    setPlatform(val);
    setPage(1);
  };

  const handleDateChange = (field: "from" | "to", val: string) => {
    if (field === "from") setDateFrom(val);
    else setDateTo(val);
    setPage(1);
  };

  const exportCSV = () => {
    if (!data?.items?.length) return;
    const headers = ["Product Name", "SKU", "Platform", "MRP (₹)", "Avg Rate (₹)", "Orders", "Total Purchase (₹)", "Total Revenue (₹)", "Return Qty", "Total Amount (₹)"];
    const rows = data.items.map((r) => {
      const returnQty = returnQtyMap.get(r.sku.trim().toUpperCase()) ?? 0;
      const totalAmount = r.mrp != null ? (r.orderCount - returnQty) * r.mrp : null;
      return [
        `"${r.productName.replace(/"/g, '""')}"`,
        r.sku,
        r.platform,
        r.mrp != null ? r.mrp.toFixed(2) : "",
        r.avgRate.toFixed(2),
        r.orderCount,
        r.totalMrp != null ? r.totalMrp.toFixed(2) : "",
        r.totalRevenue.toFixed(2),
        returnQty > 0 ? returnQty : "",
        totalAmount != null ? totalAmount.toFixed(2) : "",
      ];
    });
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "accounting-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ col }: { col: SortBy }) => {
    if (sortBy !== col) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50 inline" />;
    return sortOrder === "asc"
      ? <ArrowUp className="ml-1 h-3.5 w-3.5 text-primary inline" />
      : <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary inline" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Accounting</h1>
          <p className="text-muted-foreground mt-1">Total revenue, rates, and profitability per product profile.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data?.items?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          title="Total Revenue"
          value={data?.summary ? formatINR(data.summary.totalRevenue) : undefined}
          icon={TrendingUp}
          loading={isLoading}
        />
        <SummaryCard
          title="Total Orders"
          value={data?.summary?.totalOrders}
          icon={ShoppingCart}
          loading={isLoading}
        />
        <SummaryCard
          title="Units Sold"
          value={data?.summary?.totalUnits}
          icon={Package}
          loading={isLoading}
        />
        <SummaryCard
          title="Distinct Products"
          value={data?.summary?.distinctProducts}
          icon={Layers}
          loading={isLoading}
        />
        <SummaryCard
          title="Return Qty"
          value={totalReturnQty}
          icon={RotateCcw}
          loading={false}
          highlight={totalReturnQty > 0}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search product or SKU…"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <Select value={platform} onValueChange={handlePlatformChange}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="meesho">Meesho</SelectItem>
                <SelectItem value="flipkart">Flipkart</SelectItem>
                <SelectItem value="amazon">Amazon</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="w-36 text-sm"
                value={dateFrom}
                onChange={(e) => handleDateChange("from", e.target.value)}
              />
              <span className="text-muted-foreground text-sm">–</span>
              <Input
                type="date"
                className="w-36 text-sm"
                value={dateTo}
                onChange={(e) => handleDateChange("to", e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      className="flex items-center font-semibold hover:text-foreground"
                      onClick={() => handleSort("productName")}
                    >
                      Product <SortIcon col="productName" />
                    </button>
                  </TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead className="text-center">MRP / Original (₹)</TableHead>
                  <TableHead className="text-center">
                    <button
                      className="flex items-center mx-auto font-semibold hover:text-foreground"
                      onClick={() => handleSort("avgRate")}
                    >
                      Avg Rate <SortIcon col="avgRate" />
                    </button>
                  </TableHead>
                  <TableHead className="text-center">
                    <button
                      className="flex items-center mx-auto font-semibold hover:text-foreground"
                      onClick={() => handleSort("orderCount")}
                    >
                      Orders <SortIcon col="orderCount" />
                    </button>
                  </TableHead>
                  <TableHead className="text-center">Total Purchase (₹)</TableHead>
                  <TableHead className="text-center">
                    <button
                      className="flex items-center mx-auto font-semibold hover:text-foreground"
                      onClick={() => handleSort("totalRevenue")}
                    >
                      Total Revenue <SortIcon col="totalRevenue" />
                    </button>
                  </TableHead>
                  <TableHead className="text-center font-semibold text-orange-600">Return</TableHead>
                  <TableHead className="text-center font-semibold">Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data?.items && data.items.length > 0 ? (
                  data.items.map((row, i) => {
                    const returnQty = returnQtyMap.get(row.sku.trim().toUpperCase()) ?? 0;
                    const totalAmount = row.mrp != null
                      ? (row.orderCount - returnQty) * row.mrp
                      : null;
                    const isPositive = totalAmount != null && totalAmount >= 0;
                    return (
                      <TableRow key={`${row.platform}-${row.sku}-${i}`}>
                        {/* Product */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <ProductImage
                              src={row.imageUrl}
                              alt={row.productName}
                              className="h-12 w-12 rounded object-cover border flex-shrink-0"
                              containerClassName="h-12 w-12 flex-shrink-0"
                              iconClassName="h-5 w-5"
                            />
                            <span className="text-xs font-medium text-muted-foreground">
                              {row.sku}
                            </span>
                          </div>
                        </TableCell>
                        {/* Platform */}
                        <TableCell>
                          <Badge
                            className={`capitalize text-xs font-medium ${PLATFORM_COLORS[row.platform] ?? "bg-gray-100 text-gray-700"}`}
                            variant="outline"
                          >
                            {row.platform}
                          </Badge>
                        </TableCell>
                        {/* MRP */}
                        <TableCell className="text-center tabular-nums text-sm text-muted-foreground line-through">
                          {row.mrp != null ? formatINR(row.mrp) : "—"}
                        </TableCell>
                        {/* Avg Rate */}
                        <TableCell className="text-center tabular-nums">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-medium">{formatINR(row.lastRate)}</span>
                            {Math.abs(row.avgRate - row.lastRate) > 1 && (
                              <span className="text-xs text-muted-foreground">avg {formatINR(row.avgRate)}</span>
                            )}
                          </div>
                        </TableCell>
                        {/* Orders */}
                        <TableCell className="text-center tabular-nums text-sm font-medium">
                          {row.orderCount.toLocaleString("en-IN")}
                        </TableCell>
                        {/* Total Purchase */}
                        <TableCell className="text-center tabular-nums text-sm text-muted-foreground">
                          {row.totalMrp != null ? formatINR(row.totalMrp) : "—"}
                        </TableCell>
                        {/* Total Revenue */}
                        <TableCell className="text-center tabular-nums">
                          <span className="font-semibold text-sm">{formatINR(row.totalRevenue)}</span>
                        </TableCell>
                        {/* Return qty */}
                        <TableCell className="text-center tabular-nums">
                          {returnQty > 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-sm text-orange-600">
                              <RotateCcw className="h-3.5 w-3.5" />
                              {returnQty}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        {/* Total Amount = (Orders − Return) × MRP */}
                        <TableCell className="text-center tabular-nums">
                          {totalAmount != null ? (
                            <div className="flex flex-col items-center">
                              <span className={`font-bold text-sm ${isPositive ? "text-green-600" : "text-red-500"}`}>
                                {formatINR(totalAmount)}
                              </span>
                              <span className="text-xs text-muted-foreground mt-0.5">
                                ({row.orderCount}{returnQty > 0 ? `−${returnQty}` : ""})×{formatINR(row.mrp!)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                      No accounting data found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {data && (
            <div className="px-4 py-3 border-t">
              <DataTablePagination
                page={page}
                pageSize={pageSize}
                total={data.total}
                totalPages={data.totalPages}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                itemName="products"
                className="mt-0"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  loading,
  highlight,
}: {
  title: string;
  value?: number | string;
  icon: React.ElementType;
  loading: boolean;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-orange-300 bg-orange-50/50 dark:bg-orange-950/10" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm font-medium ${highlight ? "text-orange-700 dark:text-orange-400" : ""}`}>
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? "text-orange-500" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-28 mx-auto" />
        ) : (
          <div className={`text-2xl font-bold text-center tabular-nums ${highlight ? "text-orange-600 dark:text-orange-400" : ""}`}>
            {value !== undefined ? value : "0"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
