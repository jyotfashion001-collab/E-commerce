import { useEffect, useMemo, useRef, useState } from "react";
import { fileToResizedBlob } from "@/lib/image-utils";
import { ProductImage } from "@/components/ui/product-image";
import {
  useListPurchases,
  useCreatePurchase,
  useUpdatePurchase,
  useDeletePurchase,
  getListPurchasesQueryKey,
  listPurchases,
  useListInventory,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useBrand } from "@/lib/use-brand";
import { ProductNameAutocomplete } from "@/components/product-name-autocomplete";
import { formatINR } from "@/lib/utils";
import type { Purchase } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import {
  Plus,
  ShoppingBag,
  Trash2,
  Loader2,
  Package,
  Wallet,
  Layers,
  Upload,
  X,
  ImageIcon,
  Eye,
  Pencil,
  Download,
} from "lucide-react";
import { DataTablePagination } from "@/components/data-table-pagination";
import { parseSkuList } from "@/lib/sku-parser";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangeFilter, type DateRangeValue } from "@/components/date-range-filter";

function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

interface CompanyMarketplaceForm {
  amazonSku: string;
  amazonSellingPrice: string;
  amazonGstRate: string;
  flipkartSku: string;
  flipkartSellingPrice: string;
  flipkartGstRate: string;
  meeshoSku: string;
  meeshoSellingPrice: string;
  meeshoGstRate: string;
}

const EMPTY_COMPANY_MARKETPLACE: CompanyMarketplaceForm = {
  amazonSku: "",
  amazonSellingPrice: "",
  amazonGstRate: "",
  flipkartSku: "",
  flipkartSellingPrice: "",
  flipkartGstRate: "",
  meeshoSku: "",
  meeshoSellingPrice: "",
  meeshoGstRate: "",
};

interface FormState {
  productName: string;
  category: string;
  sku: string;
  quantity: string;
  rate: string;
  vendor: string;
  partyName: string;
  purchaseDate: string;
  notes: string;
  imageUrl: string;
  amazonSku: string;
  amazonSellingPrice: string;
  amazonGstRate: string;
  flipkartSku: string;
  flipkartSellingPrice: string;
  flipkartGstRate: string;
  meeshoSku: string;
  meeshoSellingPrice: string;
  meeshoGstRate: string;
  byCompany: Record<string, CompanyMarketplaceForm>;
}

const EMPTY_FORM: FormState = {
  productName: "",
  category: "",
  sku: "",
  quantity: "1",
  rate: "",
  vendor: "",
  partyName: "",
  purchaseDate: todayISO(),
  notes: "",
  imageUrl: "",
  amazonSku: "",
  amazonSellingPrice: "",
  amazonGstRate: "",
  flipkartSku: "",
  flipkartSellingPrice: "",
  flipkartGstRate: "",
  meeshoSku: "",
  meeshoSellingPrice: "",
  meeshoGstRate: "",
  byCompany: {},
};

export default function ProductPurchase() {
  const { brand, companies } = useBrand();
  const activeCompany = companies.find((c) => c.slug === brand);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [dateRange, setDateRange] = useState<DateRangeValue>({});
  const [sortKey, setSortKey] = useState<
    "date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "qty-desc" | "qty-asc"
  >("date-desc");

  const sortParams = useMemo<{
    sortBy: "purchaseDate" | "total" | "quantity";
    sortOrder: "asc" | "desc";
  }>(() => {
    switch (sortKey) {
      case "date-asc":
        return { sortBy: "purchaseDate", sortOrder: "asc" };
      case "amount-desc":
        return { sortBy: "total", sortOrder: "desc" };
      case "amount-asc":
        return { sortBy: "total", sortOrder: "asc" };
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

  const { data, isLoading } = useListPurchases({
    page,
    pageSize,
    allCompanies: true,
    ...sortParams,
    ...dateParams,
  });
  const items = data?.items ?? [];
  const totals = data?.totals;

  const { data: inventoryData } = useListInventory({
    page: 1,
    pageSize: 10000,
    allCompanies: true,
  });
  const inventoryCountByName = useMemo(() => {
    const map = new Map<string, number>();
    const invItems = (inventoryData?.items ?? []) as Array<{
      productName: string;
      quantity: number;
    }>;
    for (const it of invItems) {
      const key = it.productName.trim().toLowerCase();
      map.set(key, (map.get(key) ?? 0) + (Number(it.quantity) || 0));
    }
    return map;
  }, [inventoryData]);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [viewing, setViewing] = useState<Purchase | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    productName: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const all = await listPurchases({ page: 1, pageSize: 10000 });
      const purchases = all.items ?? [];
      if (purchases.length === 0) {
        toast({
          title: "Nothing to export",
          description: "No purchases recorded yet.",
        });
        return;
      }

      const rows: Record<string, string | number>[] = [];
      for (const p of purchases) {
        const skus = parseSkuList(p.sku);
        const skuList = skus.length > 0 ? skus : [p.sku];
        const perSkuQty =
          skuList.length > 0
            ? Math.floor(p.quantity / skuList.length)
            : p.quantity;
        const remainder =
          skuList.length > 0 ? p.quantity - perSkuQty * skuList.length : 0;
        skuList.forEach((sku, idx) => {
          const qty = perSkuQty + (idx === 0 ? remainder : 0);
          rows.push({
            Date: p.purchaseDate,
            Product: p.productName,
            Category: p.category ?? "",
            SKU: sku,
            Vendor: p.vendor ?? "",
            "Party Name": p.partyName ?? "",
            Quantity: qty,
            "Rate (INR)": p.rate,
            "Total (INR)": Number((p.rate * qty).toFixed(2)),
            "Amazon SKU": p.amazonSku ?? "",
            "Amazon Selling Price": p.amazonSellingPrice ?? "",
            "Amazon GST %": p.amazonGstRate ?? "",
            "Flipkart SKU": p.flipkartSku ?? "",
            "Flipkart Selling Price": p.flipkartSellingPrice ?? "",
            "Flipkart GST %": p.flipkartGstRate ?? "",
            "Meesho SKU": p.meeshoSku ?? "",
            "Meesho Selling Price": p.meeshoSellingPrice ?? "",
            "Meesho GST %": p.meeshoGstRate ?? "",
            Notes: p.notes ?? "",
          });
        });
      }

      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Purchases");
      const stamp = todayISO();
      const brandLabel = activeCompany?.name ?? brand;
      XLSX.writeFile(wb, `product-purchases-${brandLabel}-${stamp}.xlsx`);

      toast({
        title: "Exported",
        description: `${rows.length} row${rows.length === 1 ? "" : "s"} written to Excel.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setExporting(false);
    }
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const blob = await fileToResizedBlob(file);
    const fd = new FormData();
    fd.append("file", blob, "photo.jpg");
    const res = await fetch("/api/uploads/inventory-image", {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Upload failed (${res.status})`);
    }
    const data = (await res.json()) as { url: string };
    return data.url;
  };

  const handlePhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadPhoto(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not upload photo",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const createMutation = useCreatePurchase({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Purchase recorded",
          description: form.productName,
        });
        setOpen(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        void queryClient.invalidateQueries({
          queryKey: getListPurchasesQueryKey(),
        });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Could not save purchase",
          description: err instanceof Error ? err.message : "Unknown error",
        });
      },
    },
  });

  const updateMutation = useUpdatePurchase({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Purchase updated",
          description: form.productName,
        });
        setOpen(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        void queryClient.invalidateQueries({
          queryKey: getListPurchasesQueryKey(),
        });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Could not update purchase",
          description: err instanceof Error ? err.message : "Unknown error",
        });
      },
    },
  });

  const deleteMutation = useDeletePurchase({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Purchase deleted",
          description: pendingDelete?.productName,
        });
        setPendingDelete(null);
        void queryClient.invalidateQueries({
          queryKey: getListPurchasesQueryKey(),
        });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Could not delete purchase",
          description: err instanceof Error ? err.message : "Unknown error",
        });
      },
    },
  });

  const previewTotal = useMemo(() => {
    const q = Number(form.quantity);
    const r = Number(form.rate);
    if (!Number.isFinite(q) || !Number.isFinite(r)) return 0;
    return q * r;
  }, [form.quantity, form.rate]);

  const lastAutofilledName = useRef<string>("");
  const [autofilledFromName, setAutofilledFromName] = useState<string | null>(
    null,
  );

  function applyAutofillFromMatch(match: Purchase) {
    setForm((f) => ({
      ...f,
      category: match.category ?? "",
      vendor: match.vendor ?? "",
      partyName: match.partyName ?? "",
      imageUrl: match.imageUrl ?? "",
      amazonSku: match.amazonSku ?? "",
      amazonSellingPrice:
        match.amazonSellingPrice == null
          ? ""
          : String(match.amazonSellingPrice),
      amazonGstRate:
        match.amazonGstRate == null ? "" : String(match.amazonGstRate),
      flipkartSku: match.flipkartSku ?? "",
      flipkartSellingPrice:
        match.flipkartSellingPrice == null
          ? ""
          : String(match.flipkartSellingPrice),
      flipkartGstRate:
        match.flipkartGstRate == null ? "" : String(match.flipkartGstRate),
      meeshoSku: match.meeshoSku ?? "",
      meeshoSellingPrice:
        match.meeshoSellingPrice == null
          ? ""
          : String(match.meeshoSellingPrice),
      meeshoGstRate:
        match.meeshoGstRate == null ? "" : String(match.meeshoGstRate),
      byCompany: purchaseByCompanyToForm(match),
    }));
  }

  function buildByCompanyPayload(
    src: Record<string, CompanyMarketplaceForm>,
  ): Record<string, Record<string, string | number>> {
    const numOrU = (s: string) => {
      const t = s.trim();
      if (!t) return undefined;
      const n = Number(t);
      return Number.isFinite(n) && n >= 0 ? n : undefined;
    };
    const out: Record<string, Record<string, string | number>> = {};
    for (const [slug, m] of Object.entries(src)) {
      const entry: Record<string, string | number> = {};
      const sku = m.amazonSku.trim();
      if (sku) entry["amazonSku"] = sku;
      const asp = numOrU(m.amazonSellingPrice);
      if (asp != null) entry["amazonSellingPrice"] = asp;
      const agst = numOrU(m.amazonGstRate);
      if (agst != null) entry["amazonGstRate"] = agst;
      const fsku = m.flipkartSku.trim();
      if (fsku) entry["flipkartSku"] = fsku;
      const fsp = numOrU(m.flipkartSellingPrice);
      if (fsp != null) entry["flipkartSellingPrice"] = fsp;
      const fgst = numOrU(m.flipkartGstRate);
      if (fgst != null) entry["flipkartGstRate"] = fgst;
      const msku = m.meeshoSku.trim();
      if (msku) entry["meeshoSku"] = msku;
      const msp = numOrU(m.meeshoSellingPrice);
      if (msp != null) entry["meeshoSellingPrice"] = msp;
      const mgst = numOrU(m.meeshoGstRate);
      if (mgst != null) entry["meeshoGstRate"] = mgst;
      if (Object.keys(entry).length > 0) out[slug] = entry;
    }
    return out;
  }

  function purchaseByCompanyToForm(
    p: Purchase,
  ): Record<string, CompanyMarketplaceForm> {
    const raw = (p as unknown as {
      byCompany?: Record<string, Partial<Record<keyof CompanyMarketplaceForm, unknown>>>;
    }).byCompany;
    if (!raw || typeof raw !== "object") return {};
    const out: Record<string, CompanyMarketplaceForm> = {};
    for (const [slug, val] of Object.entries(raw)) {
      if (!val || typeof val !== "object") continue;
      out[slug] = {
        amazonSku:
          typeof val.amazonSku === "string" ? val.amazonSku : "",
        amazonSellingPrice:
          val.amazonSellingPrice == null ? "" : String(val.amazonSellingPrice),
        amazonGstRate:
          val.amazonGstRate == null ? "" : String(val.amazonGstRate),
        flipkartSku:
          typeof val.flipkartSku === "string" ? val.flipkartSku : "",
        flipkartSellingPrice:
          val.flipkartSellingPrice == null
            ? ""
            : String(val.flipkartSellingPrice),
        flipkartGstRate:
          val.flipkartGstRate == null ? "" : String(val.flipkartGstRate),
        meeshoSku:
          typeof val.meeshoSku === "string" ? val.meeshoSku : "",
        meeshoSellingPrice:
          val.meeshoSellingPrice == null ? "" : String(val.meeshoSellingPrice),
        meeshoGstRate:
          val.meeshoGstRate == null ? "" : String(val.meeshoGstRate),
      };
    }
    return out;
  }

  useEffect(() => {
    if (!open || editingId != null) return;
    const name = form.productName.trim().toLowerCase();
    if (!name) {
      if (lastAutofilledName.current !== "") {
        lastAutofilledName.current = "";
        setAutofilledFromName(null);
      }
      return;
    }
    if (lastAutofilledName.current === name) return;
    const match = items.find(
      (p) => p.productName.trim().toLowerCase() === name,
    );
    if (!match) {
      lastAutofilledName.current = name;
      setAutofilledFromName(null);
      return;
    }
    lastAutofilledName.current = name;
    setAutofilledFromName(match.productName);
    applyAutofillFromMatch(match);
  }, [form.productName, items, open, editingId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const productName = form.productName.trim();
    const sku =
      form.sku.trim() ||
      `P${Date.now().toString(36).slice(-6).toUpperCase()}`;
    const quantity = Number(form.quantity) || 1;
    const rate = Number(form.rate);
    if (!productName) return;
    if (!Number.isFinite(rate) || rate < 0) return;
    const purchaseDate = form.purchaseDate || todayISO();

    const numOrUndef = (s: string): number | undefined => {
      const t = s.trim();
      if (!t) return undefined;
      const n = Number(t);
      return Number.isFinite(n) && n >= 0 ? n : undefined;
    };

    const payload = {
      productName,
      sku,
      quantity,
      rate,
      vendor: form.vendor.trim() || undefined,
      partyName: form.partyName.trim() || undefined,
      category: form.category.trim() || undefined,
      purchaseDate: new Date(`${purchaseDate}T00:00:00`).toISOString(),
      notes: form.notes.trim() || undefined,
      imageUrl: form.imageUrl || undefined,
      amazonSku: form.amazonSku.trim() || undefined,
      amazonSellingPrice: numOrUndef(form.amazonSellingPrice),
      amazonGstRate: numOrUndef(form.amazonGstRate),
      flipkartSku: form.flipkartSku.trim() || undefined,
      flipkartSellingPrice: numOrUndef(form.flipkartSellingPrice),
      flipkartGstRate: numOrUndef(form.flipkartGstRate),
      meeshoSku: form.meeshoSku.trim() || undefined,
      meeshoSellingPrice: numOrUndef(form.meeshoSellingPrice),
      meeshoGstRate: numOrUndef(form.meeshoGstRate),
      byCompany: buildByCompanyPayload(form.byCompany),
    };

    if (editingId != null) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  function purchaseToForm(p: Purchase): FormState {
    return {
      productName: p.productName,
      category: p.category ?? "",
      sku: p.sku,
      quantity: String(p.quantity),
      rate: String(p.rate),
      vendor: p.vendor ?? "",
      partyName: p.partyName ?? "",
      purchaseDate: format(parseISO(p.purchaseDate), "yyyy-MM-dd"),
      notes: p.notes ?? "",
      imageUrl: p.imageUrl ?? "",
      amazonSku: p.amazonSku ?? "",
      amazonSellingPrice:
        p.amazonSellingPrice == null ? "" : String(p.amazonSellingPrice),
      amazonGstRate:
        p.amazonGstRate == null ? "" : String(p.amazonGstRate),
      flipkartSku: p.flipkartSku ?? "",
      flipkartSellingPrice:
        p.flipkartSellingPrice == null ? "" : String(p.flipkartSellingPrice),
      flipkartGstRate:
        p.flipkartGstRate == null ? "" : String(p.flipkartGstRate),
      meeshoSku: p.meeshoSku ?? "",
      meeshoSellingPrice:
        p.meeshoSellingPrice == null ? "" : String(p.meeshoSellingPrice),
      meeshoGstRate:
        p.meeshoGstRate == null ? "" : String(p.meeshoGstRate),
      byCompany: purchaseByCompanyToForm(p),
    };
  }

  function openEdit(p: Purchase) {
    setEditingId(p.id);
    setForm(purchaseToForm(p));
    setOpen(true);
  }

  const isSavingForm = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Inventory
          </h1>
          <p className="text-muted-foreground mt-1">
            Manually record stock you've purchased for{" "}
            <span className="font-medium text-foreground">
              {activeCompany?.name ?? brand}
            </span>
            .
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={exporting || isLoading}
            data-testid="button-export-purchases"
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export Excel
          </Button>
          <Button
            onClick={() => {
              setEditingId(null);
              setForm({ ...EMPTY_FORM, purchaseDate: todayISO() });
              setOpen(true);
            }}
            data-testid="button-add-purchase"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Purchase
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={<Wallet className="h-5 w-5 text-primary" />}
          label="Total Cost"
          value={isLoading ? null : formatINR(totals?.totalCost ?? 0)}
        />
        <SummaryCard
          icon={<Layers className="h-5 w-5 text-primary" />}
          label="Total Units"
          value={isLoading ? null : (totals?.totalUnits ?? 0).toString()}
        />
        <SummaryCard
          icon={<ShoppingBag className="h-5 w-5 text-primary" />}
          label="Entries"
          value={isLoading ? null : (totals?.totalEntries ?? 0).toString()}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Recorded Purchases</CardTitle>
              <CardDescription>
                Filter by date or sort by amount/quantity.
              </CardDescription>
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
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No purchases recorded yet.
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  setEditingId(null);
                  setForm({ ...EMPTY_FORM, purchaseDate: todayISO() });
                  setOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add your first purchase
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Photo</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Inventory</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p) => (
                    <TableRow key={p.id} data-testid={`row-purchase-${p.id}`}>
                      <TableCell>
                        <ProductImage
                          src={p.imageUrl}
                          alt={p.productName}
                          className="h-12 w-12 rounded-md object-cover border"
                          containerClassName="h-12 w-12 rounded-md"
                          iconClassName="h-5 w-5"
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(parseISO(p.purchaseDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {companies.find((c) => c.slug === p.brand)?.name ?? p.brand}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{p.productName}</div>
                        {p.notes && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {p.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {inventoryCountByName.get(
                          p.productName.trim().toLowerCase(),
                        ) ?? 0}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatINR(p.rate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatINR(p.total)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewing(p)}
                            data-testid={`button-view-purchase-${p.id}`}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(p)}
                            data-testid={`button-edit-purchase-${p.id}`}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              setPendingDelete({
                                id: p.id,
                                productName: p.productName,
                              })
                            }
                            data-testid={`button-delete-purchase-${p.id}`}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {data && data.total > 0 && (
            <DataTablePagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              totalPages={data.totalPages}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              itemName="purchases"
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditingId(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingId != null ? "Edit purchase" : "Add purchase"}
              </DialogTitle>
              <DialogDescription>
                {editingId != null
                  ? "Update the details of this purchase."
                  : "Recording stock you bought from a vendor."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="purchase-product">Product name</Label>
                <ProductNameAutocomplete
                  id="purchase-product"
                  value={form.productName}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, productName: v }))
                  }
                  placeholder="Search or type a product name…"
                  required
                  autoFocus
                  maxLength={200}
                  data-testid="input-purchase-product"
                />
              </div>
              {companies.map((company) => {
                const cm =
                  form.byCompany[company.slug] ?? EMPTY_COMPANY_MARKETPLACE;
                const updateCompany = (
                  patch: Partial<CompanyMarketplaceForm>,
                ) =>
                  setForm((f) => ({
                    ...f,
                    byCompany: {
                      ...f.byCompany,
                      [company.slug]: {
                        ...EMPTY_COMPANY_MARKETPLACE,
                        ...(f.byCompany[company.slug] ?? {}),
                        ...patch,
                      },
                    },
                  }));
                return (
                  <div
                    key={company.slug}
                    className="rounded-md border p-3 space-y-3"
                    data-testid={`section-marketplace-${company.slug}`}
                  >
                    <div className="text-sm font-medium">
                      {company.name} — Marketplace SKU, selling price & GST
                      rate (optional)
                    </div>
                    <PlatformRow
                      label="Amazon"
                      color="text-orange-600"
                      sku={cm.amazonSku}
                      price={cm.amazonSellingPrice}
                      gst={cm.amazonGstRate}
                      onSku={(v) => updateCompany({ amazonSku: v })}
                      onPrice={(v) =>
                        updateCompany({ amazonSellingPrice: v })
                      }
                      onGst={(v) => updateCompany({ amazonGstRate: v })}
                      testIdPrefix={`${company.slug}-amazon`}
                    />
                    <PlatformRow
                      label="Flipkart"
                      color="text-blue-600"
                      sku={cm.flipkartSku}
                      price={cm.flipkartSellingPrice}
                      gst={cm.flipkartGstRate}
                      onSku={(v) => updateCompany({ flipkartSku: v })}
                      onPrice={(v) =>
                        updateCompany({ flipkartSellingPrice: v })
                      }
                      onGst={(v) => updateCompany({ flipkartGstRate: v })}
                      testIdPrefix={`${company.slug}-flipkart`}
                    />
                    <PlatformRow
                      label="Meesho"
                      color="text-pink-600"
                      sku={cm.meeshoSku}
                      price={cm.meeshoSellingPrice}
                      gst={cm.meeshoGstRate}
                      onSku={(v) => updateCompany({ meeshoSku: v })}
                      onPrice={(v) =>
                        updateCompany({ meeshoSellingPrice: v })
                      }
                      onGst={(v) => updateCompany({ meeshoGstRate: v })}
                      testIdPrefix={`${company.slug}-meesho`}
                    />
                  </div>
                );
              })}

            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setEditingId(null);
                }}
                disabled={isSavingForm}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingForm}
                data-testid="button-submit-purchase"
              >
                {isSavingForm && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingId != null ? "Save Changes" : "Save Purchase"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={viewing !== null}
        onOpenChange={(o) => !o && setViewing(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase details</DialogTitle>
            <DialogDescription>
              {viewing?.productName ?? ""}
            </DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="grid gap-4 py-2 text-sm">
              {viewing.imageUrl && (
                <div className="flex justify-center">
                  <ProductImage
                    src={viewing.imageUrl}
                    alt={viewing.productName}
                    className="max-h-48 rounded-md border object-contain"
                    containerClassName="h-48 w-48 rounded-md"
                    iconClassName="h-10 w-10"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <ViewField label="Internal SKU" value={viewing.sku} />
                <ViewField
                  label="Purchase date"
                  value={format(parseISO(viewing.purchaseDate), "dd MMM yyyy")}
                />
                <ViewField label="Product name" value={viewing.productName} />
                <ViewField label="Category" value={viewing.category ?? "—"} />
                <ViewField
                  label="Quantity"
                  value={String(viewing.quantity)}
                />
                <ViewField label="Rate" value={formatINR(viewing.rate)} />
                <ViewField label="Total Amount" value={formatINR(viewing.total)} />
                <ViewField label="Vendor" value={viewing.vendor ?? "—"} />
                <ViewField
                  label="Party name"
                  value={viewing.partyName ?? "—"}
                />
              </div>

              {(() => {
                const viewingByCompany = purchaseByCompanyToForm(viewing);
                return companies.map((company) => {
                  const cm = viewingByCompany[company.slug];
                  const num = (s: string): number | null => {
                    if (!s) return null;
                    const n = Number(s);
                    return Number.isFinite(n) ? n : null;
                  };
                  return (
                    <div key={company.slug} className="border-t pt-3">
                      <div className="font-medium mb-2">
                        {company.name} — Marketplace details
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <MarketplaceView
                          title="Amazon"
                          sku={cm?.amazonSku || null}
                          price={num(cm?.amazonSellingPrice ?? "")}
                          gst={num(cm?.amazonGstRate ?? "")}
                        />
                        <MarketplaceView
                          title="Flipkart"
                          sku={cm?.flipkartSku || null}
                          price={num(cm?.flipkartSellingPrice ?? "")}
                          gst={num(cm?.flipkartGstRate ?? "")}
                        />
                        <MarketplaceView
                          title="Meesho"
                          sku={cm?.meeshoSku || null}
                          price={num(cm?.meeshoSellingPrice ?? "")}
                          gst={num(cm?.meeshoGstRate ?? "")}
                        />
                      </div>
                    </div>
                  );
                });
              })()}

              {viewing.notes && (
                <ViewField label="Notes" value={viewing.notes} />
              )}
            </div>
          )}
          <DialogFooter>
            {viewing && (
              <Button
                variant="outline"
                onClick={() => {
                  const p = viewing;
                  setViewing(null);
                  openEdit(p);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            <Button onClick={() => setViewing(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this purchase?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.productName}" will be permanently removed from
              your purchase log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete)
                  deleteMutation.mutate({ id: pendingDelete.id });
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-purchase"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SkuTagInput({
  value,
  onChange,
  placeholder,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  testId?: string;
}) {
  const [inputVal, setInputVal] = useState("");

  const tags = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  function addTag(raw: string) {
    const newTags = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !tags.includes(s));
    if (newTags.length === 0) return;
    onChange([...tags, ...newTags].join(", "));
    setInputVal("");
  }

  function removeTag(tag: string) {
    onChange(
      tags
        .filter((t) => t !== tag)
        .join(", "),
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
      e.preventDefault();
      const val = inputVal.replace(/,+$/, "").trim();
      if (val) addTag(val);
    } else if (e.key === "Backspace" && inputVal === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]!);
    }
  }

  function handleBlur() {
    const val = inputVal.replace(/,+$/, "").trim();
    if (val) addTag(val);
  }

  return (
    <div className="min-h-[36px] flex flex-wrap gap-1 items-center border rounded-md px-2 py-1.5 bg-background focus-within:ring-1 focus-within:ring-ring cursor-text">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 rounded-full bg-muted border px-2 py-0.5 text-xs font-mono shrink-0"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="ml-0.5 hover:text-destructive transition-colors"
            tabIndex={-1}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? placeholder : "Add SKU…"}
        className="flex-1 min-w-[90px] outline-none bg-transparent text-sm placeholder:text-muted-foreground"
        data-testid={testId}
      />
    </div>
  );
}

function PlatformRow({
  label,
  color,
  sku,
  price,
  gst,
  onSku,
  onPrice,
  onGst,
  testIdPrefix,
}: {
  label: string;
  color: string;
  sku: string;
  price: string;
  gst: string;
  onSku: (v: string) => void;
  onPrice: (v: string) => void;
  onGst: (v: string) => void;
  testIdPrefix: string;
}) {
  return (
    <div className="grid grid-cols-[80px_1fr_1fr_110px] items-start gap-3">
      <div className={`text-sm font-medium pt-2 ${color}`}>{label}</div>
      <SkuTagInput
        value={sku}
        onChange={onSku}
        placeholder={`e.g. JF-02`}
        testId={`input-purchase-${testIdPrefix}-sku`}
      />
      <Input
        type="number"
        min={0}
        step="0.01"
        value={price}
        onChange={(e) => onPrice(e.target.value)}
        placeholder="Selling price (₹)"
        data-testid={`input-purchase-${testIdPrefix}-price`}
      />
      <Input
        type="number"
        min={0}
        max={100}
        step="0.01"
        value={gst}
        onChange={(e) => onGst(e.target.value)}
        placeholder="GST %"
        data-testid={`input-purchase-${testIdPrefix}-gst`}
      />
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

function ViewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-medium break-words">{value}</span>
    </div>
  );
}

function MarketplaceView({
  title,
  sku,
  price,
  gst,
}: {
  title: string;
  sku?: string | null;
  price?: number | null;
  gst?: number | null;
}) {
  const empty =
    (sku == null || sku === "") && price == null && gst == null;
  const parsedSkus = parseSkuList(sku ?? "");
  const hasMulti = parsedSkus.length > 1;
  return (
    <div className="rounded-md border p-3">
      <div className="font-medium text-sm mb-2">{title}</div>
      {empty ? (
        <div className="text-xs text-muted-foreground">Not listed</div>
      ) : (
        <div className="space-y-1 text-xs">
          <div>
            <span className="text-muted-foreground">SKU: </span>
            <span className="font-medium">{sku || "—"}</span>
          </div>
          {hasMulti && (
            <div className="flex flex-wrap gap-1 pt-1">
              {parsedSkus.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Price: </span>
            <span className="font-medium">
              {price == null ? "—" : formatINR(price)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">GST: </span>
            <span className="font-medium">
              {gst == null ? "—" : `${gst}%`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
