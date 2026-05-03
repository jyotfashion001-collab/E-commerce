import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  useListInventory,
  listInventory,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
  getListInventoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { formatINR } from "@/lib/utils";
import { useBrand } from "@/lib/use-brand";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeFilter, type DateRangeValue } from "@/components/date-range-filter";
import { ProductNameAutocomplete } from "@/components/product-name-autocomplete";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CalendarDays,
  Layers,
  ShoppingBag,
  Eye,
  FileDown,
} from "lucide-react";

function pickDate(item: { purchaseDate?: string | null; updatedAt?: string }): string | null {
  return item.purchaseDate ?? item.updatedAt ?? null;
}

function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function autoSku(): string {
  return `INV${Date.now().toString(36).slice(-6).toUpperCase()}`;
}

interface InventoryItemFull {
  id: number;
  brand: string;
  platform: "meesho" | "flipkart" | "amazon";
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  purchaseDate?: string | null;
  updatedAt?: string;
}

interface FormState {
  productName: string;
  quantity: string;
  rate: string;
  date: string;
}

const EMPTY_FORM: FormState = {
  productName: "",
  quantity: "1",
  rate: "",
  date: todayISO(),
};

export default function Inventory() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    productName: string;
  } | null>(null);
  const [viewing, setViewing] = useState<InventoryItemFull | null>(null);

  const [pageSize, setPageSize] = useState(25);
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [sortKey, setSortKey] = useState<
    "date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "qty-desc" | "qty-asc"
  >("date-desc");

  const sortParams = useMemo<{
    sortBy: "purchaseDate" | "price" | "quantity";
    sortOrder: "asc" | "desc";
  }>(() => {
    switch (sortKey) {
      case "date-asc":
        return { sortBy: "purchaseDate", sortOrder: "asc" };
      case "amount-desc":
        return { sortBy: "price", sortOrder: "desc" };
      case "amount-asc":
        return { sortBy: "price", sortOrder: "asc" };
      case "qty-desc":
        return { sortBy: "quantity", sortOrder: "desc" };
      case "qty-asc":
        return { sortBy: "quantity", sortOrder: "asc" };
      case "date-desc":
      default:
        return { sortBy: "purchaseDate", sortOrder: "desc" };
    }
  }, [sortKey]);

  const dateParams = useMemo(() => {
    const p: { purchaseDateFrom?: string; purchaseDateTo?: string } = {};
    if (dateRange.from) p.purchaseDateFrom = dateRange.from.toISOString();
    if (dateRange.to) p.purchaseDateTo = dateRange.to.toISOString();
    return p;
  }, [dateRange]);

  const { data, isLoading } = useListInventory({
    page,
    pageSize,
    allCompanies: true,
    ...sortParams,
    ...dateParams,
  });
  const items = (data?.items ?? []) as unknown as InventoryItemFull[];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { brand, companies } = useBrand();
  const brandName =
    companies.find((c) => c.slug === brand)?.name ?? "your brand";
  const companyNameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of companies) map.set(c.slug, c.name);
    return map;
  }, [companies]);

  const totalCost =
    (data as { totalCost?: number } | undefined)?.totalCost ??
    items.reduce((s, i) => s + i.quantity * i.price, 0);
  const totalUnitsValue =
    (data as { totalUnits?: number } | undefined)?.totalUnits ??
    items.reduce((s, i) => s + i.quantity, 0);
  const totalEntries = data?.total ?? items.length;

  async function handleExportExcel() {
    if ((data?.total ?? 0) === 0) {
      toast({
        variant: "destructive",
        title: "Nothing to export",
        description: "Add some purchases first.",
      });
      return;
    }
    const all = await listInventory({
      page: 1,
      pageSize: 100,
      sortBy: "purchaseDate",
      sortOrder: "desc",
    });
    const collected: InventoryItemFull[] = [
      ...(all.items as unknown as InventoryItemFull[]),
    ];
    for (let p = 2; p <= all.totalPages; p++) {
      const next = await listInventory({
        page: p,
        pageSize: 100,
        sortBy: "purchaseDate",
        sortOrder: "desc",
      });
      collected.push(...(next.items as unknown as InventoryItemFull[]));
    }
    const rows = collected.map((it) => {
      const d = pickDate(it);
      return {
        Date: d ? format(parseISO(d), "dd MMM yyyy") : "",
        Product: it.productName,
        Quantity: it.quantity,
        Rate: it.price,
        "Total Amount": it.quantity * it.price,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Product Purchases");
    const stamp = format(new Date(), "yyyy-MM-dd");
    XLSX.writeFile(wb, `product-purchases-${brand}-${stamp}.xlsx`);
  }

  const previewTotal = useMemo(() => {
    const q = Number(form.quantity);
    const r = Number(form.rate);
    if (!Number.isFinite(q) || !Number.isFinite(r)) return 0;
    return q * r;
  }, [form.quantity, form.rate]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });

  const createMutation = useCreateInventoryItem({
    mutation: {
      onSuccess: () => {
        toast({ title: "Item added", description: form.productName });
        setOpen(false);
        setForm(EMPTY_FORM);
        void invalidate();
      },
      onError: () =>
        toast({ variant: "destructive", title: "Could not add item" }),
    },
  });

  const updateMutation = useUpdateInventoryItem({
    mutation: {
      onSuccess: () => {
        toast({ title: "Item updated" });
        setOpen(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        void invalidate();
      },
      onError: () =>
        toast({ variant: "destructive", title: "Could not update item" }),
    },
  });

  const deleteMutation = useDeleteInventoryItem({
    mutation: {
      onSuccess: () => {
        toast({ title: "Item deleted" });
        setPendingDelete(null);
        void invalidate();
      },
      onError: () =>
        toast({ variant: "destructive", title: "Could not delete item" }),
    },
  });

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: todayISO() });
    setOpen(true);
  }

  function openEdit(item: InventoryItemFull) {
    setEditingId(item.id);
    const dateSrc = pickDate(item);
    setForm({
      productName: item.productName,
      quantity: String(item.quantity),
      rate: String(item.price),
      date: dateSrc ? format(parseISO(dateSrc), "yyyy-MM-dd") : todayISO(),
    });
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const productName = form.productName.trim();
    const quantity = Math.max(0, Number(form.quantity) || 0);
    const price = Number(form.rate);
    if (!productName || !Number.isFinite(price) || price < 0) return;

    const purchaseDateIso = form.date
      ? new Date(`${form.date}T00:00:00`).toISOString()
      : undefined;

    if (editingId != null) {
      updateMutation.mutate({
        id: editingId,
        data: {
          productName,
          quantity,
          price,
          ...(purchaseDateIso ? { purchaseDate: purchaseDateIso } : {}),
        },
      });
    } else {
      createMutation.mutate({
        data: {
          platform: "meesho",
          productName,
          sku: autoSku(),
          quantity,
          price,
          ...(purchaseDateIso ? { purchaseDate: purchaseDateIso } : {}),
        },
      });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Product Purchase
          </h1>
          <p className="text-muted-foreground mt-1">
            Manually record stock you've purchased for{" "}
            <span className="font-semibold text-foreground">{brandName}</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportExcel} className="gap-2">
            <FileDown className="h-4 w-4" />
            Export Excel
          </Button>
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Purchase
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {!isLoading && data && (
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Total Cost"
            value={formatINR(totalCost)}
          />
          <SummaryCard
            icon={<Layers className="h-5 w-5" />}
            label="Total Units"
            value={String(totalUnitsValue)}
          />
          <SummaryCard
            icon={<ShoppingBag className="h-5 w-5" />}
            label="Entries"
            value={String(totalEntries)}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Recorded Purchases
              </CardTitle>
              <CardDescription>Filter by date or sort by amount/quantity.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DateRangeFilter
                label="Purchase Date"
                value={dateRange}
                onChange={(v) => {
                  setDateRange(v);
                  setPage(1);
                }}
              />
              <Select
                value={sortKey}
                onValueChange={(v) => {
                  setSortKey(v as typeof sortKey);
                  setPage(1);
                }}
              >
                <SelectTrigger className="min-w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date: Newest first</SelectItem>
                  <SelectItem value="date-asc">Date: Oldest first</SelectItem>
                  <SelectItem value="amount-desc">Amount: High to Low</SelectItem>
                  <SelectItem value="amount-asc">Amount: Low to High</SelectItem>
                  <SelectItem value="qty-desc">Quantity: High to Low</SelectItem>
                  <SelectItem value="qty-asc">Quantity: Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No items yet.</p>
              <Button size="sm" className="mt-3" onClick={openAdd}>
                <Plus className="mr-1 h-4 w-4" />
                Add your first item
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="w-28 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const d = pickDate(item);
                      return (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {d ? format(parseISO(d), "MMM dd, yyyy") : "—"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {companyNameBySlug.get(item.brand) ?? item.brand}
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatINR(item.price)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {formatINR(item.quantity * item.price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => setViewing(item)}
                              title="View"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 hover:text-blue-700"
                              onClick={() => openEdit(item)}
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() =>
                                setPendingDelete({
                                  id: item.id,
                                  productName: item.productName,
                                })
                              }
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {data && (
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                  <p className="text-sm text-muted-foreground">
                    {data.total === 0
                      ? "No entries"
                      : `Showing ${(data.page - 1) * data.pageSize + 1}–${Math.min(
                          data.page * data.pageSize,
                          data.total,
                        )} of ${data.total} entries`}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Rows per page
                      </span>
                      <Select
                        value={String(pageSize)}
                        onValueChange={(v) => {
                          setPageSize(Number(v));
                          setPage(1);
                        }}
                      >
                        <SelectTrigger className="h-8 w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 25, 50, 100].map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {data.totalPages > 1 && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPage((p) => Math.min(data.totalPages, p + 1))
                          }
                          disabled={page === data.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditingId(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingId != null ? "Edit Item" : "Add Item"}
              </DialogTitle>
              <DialogDescription>
                {editingId != null
                  ? "Update the item details."
                  : "Add a new stock item."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="inv-name">Product Name</Label>
                <ProductNameAutocomplete
                  id="inv-name"
                  value={form.productName}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, productName: v }))
                  }
                  placeholder="Search or type a product name…"
                  required
                  autoFocus
                  maxLength={200}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="inv-qty">Quantity</Label>
                  <Input
                    id="inv-qty"
                    type="number"
                    min={0}
                    step={1}
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, quantity: e.target.value }))
                    }
                    placeholder="e.g. 10"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inv-rate">Rate (₹)</Label>
                  <Input
                    id="inv-rate"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.rate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, rate: e.target.value }))
                    }
                    placeholder="e.g. 250"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="inv-date">Date</Label>
                <Input
                  id="inv-date"
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-bold tabular-nums">
                  {formatINR(previewTotal)}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingId != null ? "Save Changes" : "Save Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <strong>{pendingDelete?.productName}</strong> from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                pendingDelete && deleteMutation.mutate({ id: pendingDelete.id })
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Dialog */}
      <Dialog
        open={!!viewing}
        onOpenChange={(o) => !o && setViewing(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Purchase Details</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold">{viewing.productName}</p>
                <p className="text-sm text-muted-foreground">
                  {(() => {
                    const d = pickDate(viewing);
                    return d ? format(parseISO(d), "MMM dd, yyyy") : "—";
                  })()}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <p className="font-semibold tabular-nums">
                    {viewing.quantity}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Rate</p>
                  <p className="font-semibold tabular-nums">
                    {formatINR(viewing.price)}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-semibold tabular-nums">
                    {formatINR(viewing.quantity * viewing.price)}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>
              Close
            </Button>
            {viewing && (
              <Button
                onClick={() => {
                  const v = viewing;
                  setViewing(null);
                  openEdit(v);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className="text-xl font-bold tabular-nums mt-0.5 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}
