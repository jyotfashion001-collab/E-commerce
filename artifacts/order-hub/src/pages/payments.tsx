import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTablePagination } from "@/components/data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Upload as UploadIcon,
  Search,
  Wallet,
  Trash2,
  AlertCircle,
  Columns3,
  Calendar as CalendarIcon,
  FilterX,
  Pencil,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format as formatDate } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  useListPayments,
  useClearPayments,
  useUpdatePayment,
  useDeletePayments,
  type PaymentPlatform,
  type PaymentReview,
  type PaymentRow,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PLATFORM_LABELS: Record<PaymentPlatform, string> = {
  meesho: "Meesho",
  flipkart: "Flipkart",
  amazon: "Amazon",
};

const PLATFORM_TINT: Record<PaymentPlatform, string> = {
  meesho: "bg-[#e83e8c]/10 text-[#e83e8c] border-[#e83e8c]/20",
  flipkart: "bg-[#007bff]/10 text-[#007bff] border-[#007bff]/20",
  amazon: "bg-[#fd7e14]/10 text-[#fd7e14] border-[#fd7e14]/20",
};

const STATUS_COLORS: Record<string, string> = {
  delivered: "bg-green-500/10 text-green-600 border-green-500/20",
  shipped: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  rto: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  rto_initiated: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  return: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  exchange: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

function getStatusColor(status: string) {
  return (
    STATUS_COLORS[status.toLowerCase()] ??
    "bg-muted text-muted-foreground border-border"
  );
}

const PAYMENT_REVIEW_COLORS: Record<PaymentReview, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const PAYMENT_REVIEW_CELL_BG: Record<PaymentReview, string> = {
  pending: "",
  success: "bg-emerald-500/20",
};

const PAYMENT_REVIEW_LABELS: Record<PaymentReview, string> = {
  pending: "Pending",
  success: "Success",
};

const PRICE_TYPE_COLORS: Record<string, string> = {
  basic: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  premium_return: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  premium: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
};

function getPriceTypeColor(t: string) {
  return (
    PRICE_TYPE_COLORS[t.toLowerCase()] ??
    "bg-muted text-muted-foreground border-border"
  );
}

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function num(v: string | undefined): number {
  if (!v) return 0;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fmtAmount(v: string | number) {
  const n = typeof v === "number" ? v : num(v);
  if (n === 0) return <span className="text-muted-foreground">—</span>;
  const positive = n > 0;
  return (
    <span
      className={
        positive
          ? "text-green-600 dark:text-green-400"
          : "text-rose-600 dark:text-rose-400"
      }
    >
      {INR.format(n)}
    </span>
  );
}

function fmtPlain(v: string | number) {
  const n = typeof v === "number" ? v : num(v);
  if (n === 0) return <span className="text-muted-foreground">—</span>;
  return INR.format(n);
}

function fmtSettlement(v: string | number) {
  const n = typeof v === "number" ? v : num(v);
  if (n === 0) return <span className="text-muted-foreground">—</span>;
  const positive = n > 0;
  return (
    <span
      className={
        positive
          ? "font-bold text-green-600 dark:text-green-400"
          : "font-bold text-rose-600 dark:text-rose-400"
      }
    >
      {INR.format(n)}
    </span>
  );
}

type ToggleableColumn =
  | "source"
  | "priceType"
  | "qty"
  | "saleAmount"
  | "returnAmount"
  | "commission"
  | "shipping"
  | "returnFees"
  | "tcs"
  | "tds";

const COLUMN_LABELS: Record<ToggleableColumn, string> = {
  source: "Source",
  priceType: "Price Type",
  qty: "Qty",
  saleAmount: "Sale Amount",
  returnAmount: "Return Amount",
  commission: "Commission",
  shipping: "Shipping",
  returnFees: "Return Fees",
  tcs: "TCS",
  tds: "TDS",
};

const COLUMN_ORDER: ToggleableColumn[] = [
  "source",
  "priceType",
  "qty",
  "saleAmount",
  "returnAmount",
  "commission",
  "shipping",
  "returnFees",
  "tcs",
  "tds",
];

const ALL_TINT =
  "bg-indigo-500/10 text-indigo-600 border-indigo-500/30 dark:text-indigo-400";
const SOURCE_TINT = "bg-amber-500/10 text-amber-600 border-amber-500/30";

function platformTriggerTint(v: string) {
  if (v === "all") return ALL_TINT;
  return PLATFORM_TINT[v as PaymentPlatform] ?? "";
}

function statusTriggerTint(v: string) {
  if (v === "all") return ALL_TINT;
  return getStatusColor(v);
}

function reviewTriggerTint(v: string) {
  if (v === "all") return ALL_TINT;
  return PAYMENT_REVIEW_COLORS[v as PaymentReview] ?? "";
}

function sourceTriggerTint(v: string) {
  if (v === "all") return ALL_TINT;
  return SOURCE_TINT;
}

function parseLocalISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const COLUMN_PREFS_KEY = "orderhub_payments_column_visibility_v2";

function loadColumnPrefs(): Record<ToggleableColumn, boolean> {
  const defaults = COLUMN_ORDER.reduce(
    (acc, c) => {
      acc[c] = false;
      return acc;
    },
    {} as Record<ToggleableColumn, boolean>,
  );
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(COLUMN_PREFS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<ToggleableColumn, boolean>>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export default function Payments() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | PaymentPlatform>(
    "all",
  );
  const [reviewFilter, setReviewFilter] = useState<"all" | PaymentReview>("all");

  type DatePreset = "all" | "today" | "yesterday" | "last3" | "last7" | "custom";
  type DateField = "order" | "payment";
  interface DateState {
    preset: DatePreset;
    from: string;
    to: string;
  }
  const emptyDateState: DateState = { preset: "all", from: "", to: "" };
  const [orderDate, setOrderDate] = useState<DateState>(emptyDateState);
  const [paymentDate, setPaymentDate] = useState<DateState>(emptyDateState);

  const [dateOpen, setDateOpen] = useState(false);
  const [dateTab, setDateTab] = useState<DateField>("order");
  const [draftOrder, setDraftOrder] = useState<DateState>(emptyDateState);
  const [draftPayment, setDraftPayment] = useState<DateState>(emptyDateState);

  const [customDateOpen, setCustomDateOpen] = useState(false);
  const [customDateField, setCustomDateField] =
    useState<DateField>("order");
  const [customDraftRange, setCustomDraftRange] = useState<
    DateRange | undefined
  >(undefined);

  const openCustomDialog = (field: DateField) => {
    const cur = field === "order" ? draftOrder : draftPayment;
    setCustomDateField(field);
    setCustomDraftRange(
      cur.preset === "custom" && (cur.from || cur.to)
        ? {
            from: cur.from ? parseLocalISODate(cur.from) : undefined,
            to: cur.to ? parseLocalISODate(cur.to) : undefined,
          }
        : undefined,
    );
    setCustomDateOpen(true);
  };

  const applyCustomDialog = () => {
    const setter =
      customDateField === "order" ? setDraftOrder : setDraftPayment;
    setter({
      preset: "custom",
      from: customDraftRange?.from
        ? toLocalISODate(customDraftRange.from)
        : "",
      to: customDraftRange?.to ? toLocalISODate(customDraftRange.to) : "",
    });
    setCustomDateOpen(false);
  };

  const ymd = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const presetRange = (p: DatePreset): { from: string; to: string } => {
    const today = new Date();
    if (p === "today") return { from: ymd(today), to: ymd(today) };
    if (p === "yesterday") {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      return { from: ymd(y), to: ymd(y) };
    }
    if (p === "last3") {
      const start = new Date(today);
      start.setDate(today.getDate() - 2);
      return { from: ymd(start), to: ymd(today) };
    }
    if (p === "last7") {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { from: ymd(start), to: ymd(today) };
    }
    return { from: "", to: "" };
  };

  const setDraftPreset = (field: DateField, p: DatePreset) => {
    const setter = field === "order" ? setDraftOrder : setDraftPayment;
    if (p === "custom") {
      setter((prev) => ({ ...prev, preset: "custom" }));
    } else {
      const r = presetRange(p);
      setter({ preset: p, from: r.from, to: r.to });
    }
  };

  const dateLabel = (s: DateState) => {
    if (s.preset === "all" || (!s.from && !s.to)) return "";
    if (s.preset === "today") return "Today";
    if (s.preset === "yesterday") return "Yesterday";
    if (s.preset === "last3") return "Last 3 days";
    if (s.preset === "last7") return "Last 7 days";
    if (s.from && s.to && s.from === s.to) return s.from;
    if (s.from && s.to) return `${s.from} → ${s.to}`;
    if (s.from) return `≥ ${s.from}`;
    return `≤ ${s.to}`;
  };

  const dateChips: string[] = [];
  if (orderDate.preset !== "all") {
    dateChips.push(`Order: ${dateLabel(orderDate)}`);
  }
  if (paymentDate.preset !== "all") {
    dateChips.push(`Payment: ${dateLabel(paymentDate)}`);
  }
  const dateTriggerActive = dateChips.length > 0;

  const openDatePopover = () => {
    setDraftOrder(orderDate);
    setDraftPayment(paymentDate);
    setDateOpen(true);
  };

  const applyDateFilters = () => {
    setOrderDate(draftOrder);
    setPaymentDate(draftPayment);
    setDateOpen(false);
  };

  const clearDateFilters = () => {
    setDraftOrder(emptyDateState);
    setDraftPayment(emptyDateState);
    setOrderDate(emptyDateState);
    setPaymentDate(emptyDateState);
    setDateOpen(false);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    sourceFilter !== "all" ||
    platformFilter !== "all" ||
    reviewFilter !== "all" ||
    orderDate.preset !== "all" ||
    paymentDate.preset !== "all";

  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSourceFilter("all");
    setPlatformFilter("all");
    setReviewFilter("all");
    setDraftOrder(emptyDateState);
    setDraftPayment(emptyDateState);
    setOrderDate(emptyDateState);
    setPaymentDate(emptyDateState);
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [columnVisibility, setColumnVisibility] = useState<
    Record<ToggleableColumn, boolean>
  >(() => loadColumnPrefs());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        COLUMN_PREFS_KEY,
        JSON.stringify(columnVisibility),
      );
    } catch {
      // ignore
    }
  }, [columnVisibility]);

  const toggleColumn = (col: ToggleableColumn) =>
    setColumnVisibility((prev) => ({ ...prev, [col]: !prev[col] }));

  const visibleColCount =
    10 + COLUMN_ORDER.filter((c) => columnVisibility[c]).length;

  useEffect(() => {
    setPage(1);
  }, [
    search,
    statusFilter,
    sourceFilter,
    platformFilter,
    reviewFilter,
    pageSize,
    orderDate,
    paymentDate,
  ]);

  const query = useListPayments({
    platform: platformFilter,
    search: search || undefined,
    status: statusFilter,
    source: sourceFilter,
    paymentReview: reviewFilter,
    page,
    pageSize,
    orderDateFrom: orderDate.from || undefined,
    orderDateTo: orderDate.to || undefined,
    paymentDateFrom: paymentDate.from || undefined,
    paymentDateTo: paymentDate.to || undefined,
  });

  const updatePayment = useUpdatePayment();
  const deletePayments = useDeletePayments();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [editRow, setEditRow] = useState<PaymentRow | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = (rows: PaymentRow[], selectAll: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selectAll) {
        for (const r of rows) next.add(r.id);
      } else {
        for (const r of rows) next.delete(r.id);
      }
      return next;
    });
  };

  const openEditDialog = (row: PaymentRow) => {
    setEditRow(row);
    setEditForm({
      subOrderNo: row.subOrderNo ?? "",
      sku: row.sku ?? "",
      productName: row.productName ?? "",
      quantity: row.quantity ?? "",
      orderDate: row.orderDate ?? "",
      paymentDate: row.paymentDate ?? "",
      liveOrderStatus: row.liveOrderStatus ?? "",
      orderSource: row.orderSource ?? "",
      finalSettlementAmount: row.finalSettlementAmount ?? "",
      totalSaleAmount: row.totalSaleAmount ?? "",
      meeshoCommission: row.meeshoCommission ?? "",
      shippingCharge: row.shippingCharge ?? "",
      returnShippingCharge: row.returnShippingCharge ?? "",
      tcs: row.tcs ?? "",
      tds: row.tds ?? "",
    });
  };

  const saveEditDialog = () => {
    if (!editRow) return;
    updatePayment.mutate(
      { id: editRow.id, data: editForm },
      {
        onSuccess: () => {
          toast({
            title: "Saved",
            description: `Order ${editRow.subOrderNo || editRow.id} updated.`,
          });
          setEditRow(null);
        },
        onError: (err) => {
          toast({
            title: "Failed to save",
            description:
              err instanceof Error ? err.message : "Could not update payment",
            variant: "destructive",
          });
        },
      },
    );
  };

  const confirmBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setBulkDeleteOpen(false);
      return;
    }
    deletePayments.mutate(
      { ids },
      {
        onSuccess: (data) => {
          toast({
            title: "Deleted",
            description: `${data.deleted} payment${data.deleted === 1 ? "" : "s"} removed.`,
          });
          setSelectedIds(new Set());
          setBulkDeleteOpen(false);
        },
        onError: (err) => {
          toast({
            title: "Failed to delete",
            description:
              err instanceof Error ? err.message : "Could not delete payments",
            variant: "destructive",
          });
        },
      },
    );
  };

  const clearMutation = useClearPayments({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "Cleared",
          description: `${data.deleted} payment${data.deleted === 1 ? "" : "s"} removed.`,
        });
        setSearch("");
        setStatusFilter("all");
        setSourceFilter("all");
        setPlatformFilter("all");
        setPage(1);
      },
      onError: (err) => {
        toast({
          title: "Failed to clear",
          description: err.message,
          variant: "destructive",
        });
      },
    },
  });

  const data = query.data;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalAll = data?.totalAll ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const summary = data?.summary;
  const facets = data?.facets ?? { statuses: [], sources: [] };
  const isInitialLoading = query.isLoading;
  const hasAny = totalAll > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Payments
          </h1>
          <p className="text-muted-foreground mt-1">
            Order-level settlements imported from your marketplace payment file.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/upload">
              <UploadIcon className="h-4 w-4" /> Upload Payment File
            </Link>
          </Button>
          {hasAny && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              disabled={clearMutation.isPending}
              onClick={() => {
                if (confirm("Clear all payment data?")) {
                  clearMutation.mutate();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
              {clearMutation.isPending ? "Clearing..." : "Clear All"}
            </Button>
          )}
        </div>
      </div>

      {query.isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to load payments</AlertTitle>
          <AlertDescription>
            {(query.error as Error | undefined)?.message ?? "Unknown error"}
          </AlertDescription>
        </Alert>
      )}

      {!isInitialLoading && !hasAny ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Wallet className="h-12 w-12 mb-4 opacity-15" />
          <p className="text-lg font-medium text-foreground">No payments yet</p>
          <p className="text-sm mt-1 mb-5">
            Upload your marketplace payment file to see settlement details here.
          </p>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/upload">
              <UploadIcon className="h-4 w-4" /> Go to Upload
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {summary && (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardHeader className="pb-1.5 space-y-0.5">
                  <CardDescription className="text-xs">
                    Total Payment Success
                  </CardDescription>
                  <CardTitle className="text-lg font-semibold tabular-nums truncate text-emerald-700">
                    {INR.format(summary.successAmount)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground truncate">
                  {summary.successCount} order
                  {summary.successCount === 1 ? "" : "s"} settled
                </CardContent>
              </Card>
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-1.5 space-y-0.5">
                  <CardDescription className="text-xs">
                    Total Payment Pending
                  </CardDescription>
                  <CardTitle className="text-lg font-semibold tabular-nums truncate text-amber-700">
                    {INR.format(summary.pendingAmount)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground truncate">
                  {summary.pendingCount} order
                  {summary.pendingCount === 1 ? "" : "s"} awaiting
                </CardContent>
              </Card>
              <Card className="border-indigo-500/30 bg-indigo-500/5">
                <CardHeader className="pb-1.5 space-y-0.5">
                  <CardDescription className="text-xs">
                    Settlement
                  </CardDescription>
                  <CardTitle className="text-lg font-semibold tabular-nums truncate text-indigo-700">
                    {INR.format(summary.successAmount + summary.pendingAmount)}
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
                    {INR.format(summary.rtoAmount)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground truncate">
                  {summary.rtoCount} order{summary.rtoCount === 1 ? "" : "s"} to
                  origin
                </CardContent>
              </Card>
              <Card className="border-orange-500/30 bg-orange-500/5">
                <CardHeader className="pb-1.5 space-y-0.5">
                  <CardDescription className="text-xs">
                    Return Product Amount
                  </CardDescription>
                  <CardTitle className="text-lg font-semibold tabular-nums truncate text-orange-700">
                    {INR.format(summary.returnAmount)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground truncate">
                  {summary.returnCount} customer return
                  {summary.returnCount === 1 ? "" : "s"}
                </CardContent>
              </Card>
              <Card className="border-rose-500/30 bg-rose-500/5">
                <CardHeader className="pb-1.5 space-y-0.5">
                  <CardDescription className="text-xs">
                    Return Charge
                  </CardDescription>
                  <CardTitle
                    className={`text-lg font-semibold tabular-nums truncate ${
                      (summary.returnSettlement ?? 0) < 0
                        ? "text-rose-700"
                        : "text-foreground"
                    }`}
                  >
                    {INR.format(summary.returnSettlement ?? 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground truncate">
                  {summary.returnCount} return order
                  {summary.returnCount === 1 ? "" : "s"} deducted
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1.5 space-y-0.5">
                  <CardDescription className="text-xs">
                    Comp / Claims / Recovery
                  </CardDescription>
                  <CardTitle className="text-lg font-semibold tabular-nums truncate">
                    {INR.format(
                      summary.compensation + summary.claims + summary.recovery,
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground truncate">
                  TDS {INR.format(summary.tds)} · TCS {INR.format(summary.tcs)}
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <div>
                  <CardTitle>Order Payments</CardTitle>
                  <CardDescription className="mt-0.5">
                    {total} of {totalAll} record{totalAll === 1 ? "" : "s"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search sub order, SKU, product..."
                      className="pl-8"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Popover
                    open={dateOpen}
                    onOpenChange={(o) =>
                      o ? openDatePopover() : setDateOpen(false)
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`gap-2 h-10 font-medium ${
                          dateTriggerActive
                            ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/30 dark:text-indigo-400"
                            : ""
                        }`}
                      >
                        <CalendarIcon className="h-4 w-4" />
                        {dateTriggerActive
                          ? dateChips.length === 1
                            ? dateChips[0]
                            : `${dateChips.length} date filters`
                          : "Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="w-[560px] p-0 overflow-hidden"
                    >
                      <div className="flex">
                        <div className="w-36 bg-muted/40 border-r flex flex-col py-2">
                          {(
                            [
                              { id: "order", label: "Order Date" },
                              { id: "payment", label: "Payment Date" },
                            ] as { id: DateField; label: string }[]
                          ).map((t) => {
                            const active = dateTab === t.id;
                            const draft =
                              t.id === "order" ? draftOrder : draftPayment;
                            const hasValue = draft.preset !== "all";
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => setDateTab(t.id)}
                                className={`text-left px-4 py-2.5 text-sm transition-colors ${
                                  active
                                    ? "bg-background text-indigo-600 font-medium border-l-2 border-indigo-600"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {t.label}
                                {hasValue && (
                                  <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex-1 p-4">
                          {(() => {
                            const draft =
                              dateTab === "order" ? draftOrder : draftPayment;
                            const setter =
                              dateTab === "order"
                                ? setDraftOrder
                                : setDraftPayment;
                            return (
                              <RadioGroup
                                value={draft.preset}
                                onValueChange={(v) => {
                                  if (v === "custom") {
                                    openCustomDialog(dateTab);
                                  } else {
                                    setDraftPreset(
                                      dateTab,
                                      v as DatePreset,
                                    );
                                  }
                                }}
                                className="gap-2.5"
                              >
                                {(
                                  [
                                    { v: "all", label: "All time" },
                                    { v: "today", label: "Today" },
                                    { v: "yesterday", label: "Yesterday" },
                                    { v: "last3", label: "Last 3 days" },
                                    { v: "last7", label: "Last 7 days" },
                                    {
                                      v: "custom",
                                      label: "Custom date range",
                                    },
                                  ] as { v: DatePreset; label: string }[]
                                ).map((opt) => (
                                  <div
                                    key={opt.v}
                                    className="flex items-center gap-2"
                                  >
                                    <RadioGroupItem
                                      id={`${dateTab}-${opt.v}`}
                                      value={opt.v}
                                    />
                                    <Label
                                      htmlFor={`${dateTab}-${opt.v}`}
                                      className="font-normal cursor-pointer"
                                    >
                                      {opt.label}
                                    </Label>
                                  </div>
                                ))}
                                {draft.preset === "custom" && (
                                  <div className="ml-6 mt-1 flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">
                                      {draft.from
                                        ? formatDate(
                                            parseLocalISODate(draft.from),
                                            "dd MMM ''yy",
                                          )
                                        : "—"}
                                      {" – "}
                                      {draft.to
                                        ? formatDate(
                                            parseLocalISODate(draft.to),
                                            "dd MMM ''yy",
                                          )
                                        : "—"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openCustomDialog(dateTab)
                                      }
                                      className="text-indigo-600 hover:underline font-medium"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                )}
                              </RadioGroup>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t px-4 py-2.5 bg-muted/30">
                        <button
                          type="button"
                          onClick={clearDateFilters}
                          className="text-sm text-indigo-600 hover:underline"
                        >
                          Clear Filter
                        </button>
                        <Button size="sm" onClick={applyDateFilters}>
                          Apply
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Select
                    value={platformFilter}
                    onValueChange={(v) =>
                      setPlatformFilter(v as "all" | PaymentPlatform)
                    }
                  >
                    <SelectTrigger
                      className={`w-[140px] font-medium capitalize ${platformTriggerTint(platformFilter)}`}
                    >
                      <SelectValue placeholder="All Platforms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      <SelectItem value="meesho">Meesho</SelectItem>
                      <SelectItem value="flipkart">Flipkart</SelectItem>
                      <SelectItem value="amazon">Amazon</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger
                      className={`w-[160px] font-medium capitalize ${statusTriggerTint(statusFilter)}`}
                    >
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {facets.statuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={reviewFilter}
                    onValueChange={(v) =>
                      setReviewFilter(v as "all" | PaymentReview)
                    }
                  >
                    <SelectTrigger
                      className={`w-[160px] font-medium capitalize ${reviewTriggerTint(reviewFilter)}`}
                    >
                      <SelectValue placeholder="Payment Review" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reviews</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger
                      className={`w-[150px] font-medium ${sourceTriggerTint(sourceFilter)}`}
                    >
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      {facets.sources.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedIds.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 h-10 border-rose-500/40 text-rose-600 hover:bg-rose-500/5 hover:text-rose-700"
                      onClick={() => setBulkDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete ({selectedIds.size})
                    </Button>
                  )}
                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 h-10 border-rose-500/40 text-rose-600 hover:bg-rose-500/5 hover:text-rose-700"
                      onClick={clearAllFilters}
                    >
                      <FilterX className="h-4 w-4" />
                      Clear Filter
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 h-10">
                        <Columns3 className="h-4 w-4" />
                        Columns
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel>Show / hide columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {COLUMN_ORDER.map((col) => (
                        <DropdownMenuCheckboxItem
                          key={col}
                          checked={columnVisibility[col]}
                          onCheckedChange={() => toggleColumn(col)}
                          onSelect={(e) => e.preventDefault()}
                        >
                          {COLUMN_LABELS[col]}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            items.length > 0 &&
                            items.every((r) => selectedIds.has(r.id))
                          }
                          onCheckedChange={(v) =>
                            toggleSelectAllOnPage(items, v === true)
                          }
                          aria-label="Select all on page"
                        />
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Platform
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Sub Order No
                      </TableHead>
                      <TableHead className="whitespace-nowrap">SKU</TableHead>
                      <TableHead className="text-right whitespace-nowrap">
                        Product Rate
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Order Date
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Payment Date
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="whitespace-nowrap">
                        Payment Review
                      </TableHead>
                      {columnVisibility.source && (
                        <TableHead className="whitespace-nowrap">
                          Source
                        </TableHead>
                      )}
                      {columnVisibility.priceType && (
                        <TableHead className="whitespace-nowrap">
                          Price Type
                        </TableHead>
                      )}
                      {columnVisibility.qty && (
                        <TableHead className="text-center w-12">Qty</TableHead>
                      )}
                      {columnVisibility.saleAmount && (
                        <TableHead className="text-right whitespace-nowrap">
                          Sale Amount
                        </TableHead>
                      )}
                      {columnVisibility.returnAmount && (
                        <TableHead className="text-right whitespace-nowrap">
                          Return Amount
                        </TableHead>
                      )}
                      {columnVisibility.commission && (
                        <TableHead className="text-right whitespace-nowrap">
                          Commission
                        </TableHead>
                      )}
                      {columnVisibility.shipping && (
                        <TableHead className="text-right whitespace-nowrap">
                          Shipping
                        </TableHead>
                      )}
                      {columnVisibility.returnFees && (
                        <TableHead className="text-right whitespace-nowrap">
                          Return Fees
                        </TableHead>
                      )}
                      {columnVisibility.tcs && (
                        <TableHead className="text-right whitespace-nowrap">
                          TCS
                        </TableHead>
                      )}
                      {columnVisibility.tds && (
                        <TableHead className="text-right whitespace-nowrap">
                          TDS
                        </TableHead>
                      )}
                      <TableHead className="text-right whitespace-nowrap font-semibold">
                        Settlement
                      </TableHead>
                      <TableHead className="w-12 text-center">
                        Edit
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isInitialLoading ? (
                      <TableRow>
                        <TableCell colSpan={visibleColCount} className="h-40 text-center">
                          <p className="text-muted-foreground">Loading…</p>
                        </TableCell>
                      </TableRow>
                    ) : items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={visibleColCount} className="h-40 text-center">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <Search className="h-8 w-8 mb-3 opacity-20" />
                            <p className="font-medium text-foreground">
                              No records match your filters
                            </p>
                            <p className="text-sm mt-1">
                              Try adjusting your search or filters.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((row) => {
                        const rowPlatform: PaymentPlatform =
                          row.platform ?? "meesho";
                        const isSelected = selectedIds.has(row.id);
                        return (
                          <TableRow
                            key={row.id}
                            className={`hover:bg-muted/50 ${isSelected ? "bg-indigo-500/5" : ""}`}
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectOne(row.id)}
                                aria-label={`Select order ${row.subOrderNo || row.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`whitespace-nowrap text-xs capitalize ${PLATFORM_TINT[rowPlatform]}`}
                              >
                                {PLATFORM_LABELS[rowPlatform]}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs whitespace-nowrap">
                              {row.subOrderNo || (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm font-medium whitespace-nowrap">
                              {row.sku || (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums whitespace-nowrap">
                              {row.productRate > 0 ? (
                                INR.format(row.productRate)
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {row.orderDate || "—"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {row.paymentDate || "—"}
                            </TableCell>
                            <TableCell>
                              {row.liveOrderStatus ? (
                                <Badge
                                  variant="outline"
                                  className={`whitespace-nowrap text-xs ${getStatusColor(row.liveOrderStatus)}`}
                                >
                                  {row.liveOrderStatus}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell
                              className={
                                PAYMENT_REVIEW_CELL_BG[row.paymentReview ?? "pending"]
                              }
                            >
                              <button
                                type="button"
                                disabled={updatePayment.isPending}
                                onClick={() =>
                                  updatePayment.mutate(
                                    {
                                      id: row.id,
                                      data: {
                                        paymentReview:
                                          (row.paymentReview ?? "pending") === "success"
                                            ? "pending"
                                            : "success",
                                      },
                                    },
                                    {
                                      onError: (err) => {
                                        toast({
                                          title: "Failed to update",
                                          description:
                                            err instanceof Error
                                              ? err.message
                                              : "Could not update payment review",
                                          variant: "destructive",
                                        });
                                      },
                                    },
                                  )
                                }
                                title="Click to toggle Pending / Success"
                                className="cursor-pointer disabled:opacity-50"
                              >
                                <Badge
                                  variant="outline"
                                  className={`whitespace-nowrap text-xs hover:opacity-80 ${PAYMENT_REVIEW_COLORS[row.paymentReview ?? "pending"]}`}
                                >
                                  {PAYMENT_REVIEW_LABELS[row.paymentReview ?? "pending"]}
                                </Badge>
                              </button>
                            </TableCell>
                            {columnVisibility.source && (
                              <TableCell className="text-xs whitespace-nowrap">
                                {row.orderSource ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs"
                                  >
                                    {row.orderSource}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                            )}
                            {columnVisibility.priceType && (
                              <TableCell>
                                {row.priceType ? (
                                  <Badge
                                    variant="outline"
                                    className={`whitespace-nowrap text-xs ${getPriceTypeColor(row.priceType)}`}
                                  >
                                    {row.priceType}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                            )}
                            {columnVisibility.qty && (
                              <TableCell className="text-center text-sm">
                                {row.quantity || "—"}
                              </TableCell>
                            )}
                            {columnVisibility.saleAmount && (
                              <TableCell className="text-right text-sm whitespace-nowrap">
                                {fmtPlain(row.totalSaleAmount)}
                              </TableCell>
                            )}
                            {columnVisibility.returnAmount && (
                              <TableCell className="text-right text-sm whitespace-nowrap">
                                {fmtAmount(row.totalSaleReturnAmount)}
                              </TableCell>
                            )}
                            {columnVisibility.commission && (
                              <TableCell className="text-right text-sm whitespace-nowrap">
                                {fmtAmount(row.meeshoCommission)}
                              </TableCell>
                            )}
                            {columnVisibility.shipping && (
                              <TableCell className="text-right text-sm whitespace-nowrap">
                                {fmtAmount(row.shippingCharge)}
                              </TableCell>
                            )}
                            {columnVisibility.returnFees && (
                              <TableCell className="text-right text-sm whitespace-nowrap">
                                {fmtAmount(row.returnShippingCharge)}
                              </TableCell>
                            )}
                            {columnVisibility.tcs && (
                              <TableCell className="text-right text-sm whitespace-nowrap">
                                {fmtAmount(row.tcs)}
                              </TableCell>
                            )}
                            {columnVisibility.tds && (
                              <TableCell className="text-right text-sm whitespace-nowrap">
                                {fmtAmount(row.tds)}
                              </TableCell>
                            )}
                            <TableCell className="text-right text-sm whitespace-nowrap">
                              {fmtSettlement(row.finalSettlementAmount)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(row)}
                                aria-label="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              {total > 0 && (
                <DataTablePagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  itemName="payments"
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog
        open={editRow !== null}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
      >
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit payment</DialogTitle>
            <DialogDescription>
              {editRow ? (
                <>
                  Order{" "}
                  <span className="font-mono">
                    {editRow.subOrderNo || `#${editRow.id}`}
                  </span>
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {(
              [
                ["subOrderNo", "Sub Order No"],
                ["sku", "SKU"],
                ["productName", "Product Name"],
                ["quantity", "Quantity"],
                ["orderDate", "Order Date"],
                ["paymentDate", "Payment Date"],
                ["liveOrderStatus", "Status"],
                ["orderSource", "Source"],
                ["finalSettlementAmount", "Final Settlement"],
                ["totalSaleAmount", "Total Sale Amount"],
                ["meeshoCommission", "Commission"],
                ["shippingCharge", "Shipping Charge"],
                ["returnShippingCharge", "Return Shipping"],
                ["tcs", "TCS"],
                ["tds", "TDS"],
              ] as const
            ).map(([field, label]) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={`edit-${field}`} className="text-xs">
                  {label}
                </Label>
                <Input
                  id={`edit-${field}`}
                  value={editForm[field] ?? ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      [field]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditRow(null)}
              disabled={updatePayment.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={saveEditDialog}
              disabled={updatePayment.isPending}
            >
              {updatePayment.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected payments?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedIds.size} payment
              {selectedIds.size === 1 ? "" : "s"} from your records. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePayments.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmBulkDelete();
              }}
              disabled={deletePayments.isPending}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              {deletePayments.isPending
                ? "Deleting…"
                : `Delete ${selectedIds.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={customDateOpen} onOpenChange={setCustomDateOpen}>
        <DialogContent className="sm:max-w-[440px] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Custom Date</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-2 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block">
                  From
                </Label>
                <div
                  className={`h-10 px-3 flex items-center rounded-md border text-sm ${
                    customDraftRange?.from
                      ? "border-indigo-500 ring-2 ring-indigo-500/15 text-foreground"
                      : "border-input text-muted-foreground"
                  }`}
                >
                  {customDraftRange?.from
                    ? formatDate(customDraftRange.from, "dd MMM ''yy")
                    : "Select date"}
                </div>
              </div>
              <div className="flex-1">
                <Label className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 block">
                  To
                </Label>
                <div
                  className={`h-10 px-3 flex items-center rounded-md border text-sm ${
                    customDraftRange?.to
                      ? "border-indigo-500 ring-2 ring-indigo-500/15 text-foreground"
                      : "border-input text-muted-foreground"
                  }`}
                >
                  {customDraftRange?.to
                    ? formatDate(customDraftRange.to, "dd MMM ''yy")
                    : "Select date"}
                </div>
              </div>
            </div>
            <div className="rounded-md border bg-background flex justify-center py-2">
              <Calendar
                mode="range"
                numberOfMonths={1}
                className="[--cell-size:2.5rem] w-full"
                classNames={{
                  months: "flex flex-col gap-4",
                  month: "flex w-full flex-col gap-3",
                  weekday:
                    "text-muted-foreground flex-1 select-none rounded-md text-[0.75rem] font-normal text-center",
                }}
                selected={customDraftRange}
                onSelect={setCustomDraftRange}
                defaultMonth={
                  customDraftRange?.from ?? new Date()
                }
              />
            </div>
          </div>
          <div className="flex items-center gap-2 px-6 py-4 border-t">
            <Button onClick={applyCustomDialog}>Apply</Button>
            <Button
              variant="outline"
              onClick={() => setCustomDateOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
