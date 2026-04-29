import { useState, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  useListPurchases,
  useCreatePurchase,
  useUpdatePurchase,
  useDeletePurchase,
  getListPurchasesQueryKey,
} from "@workspace/api-client-react";
import type { Purchase } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiBase } from "@/lib/api";
import { format, parseISO } from "date-fns";
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
import { formatINR } from "@/lib/utils";
import { ProductImage } from "@/components/ui/product-image";
import {
  Plus,
  ShoppingBag,
  Loader2,
  Pencil,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { fileToResizedBlob } from "@/lib/image-utils";

function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

interface FormState {
  productName: string;
  quantity: string;
  rate: string;
  purchaseDate: string;
  imageUrl: string;
}

const EMPTY_FORM: FormState = {
  productName: "",
  quantity: "1",
  rate: "",
  purchaseDate: todayISO(),
  imageUrl: "",
};

export function PurchasesSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useListPurchases({ page: 1, pageSize: 10 });
  const items = data?.items ?? [];
  const totals = data?.totals;

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    productName: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const previewTotal = useMemo(() => {
    const q = Number(form.quantity);
    const r = Number(form.rate);
    if (!Number.isFinite(q) || !Number.isFinite(r)) return 0;
    return q * r;
  }, [form.quantity, form.rate]);

  const uploadPhoto = async (file: File): Promise<string> => {
    const blob = await fileToResizedBlob(file);
    const fd = new FormData();
    fd.append("file", blob, "photo.jpg");
    const res = await fetch(`${apiBase}/uploads/inventory-image`, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    const json = (await res.json()) as { url: string };
    return json.url;
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadPhoto(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch {
      toast({ variant: "destructive", title: "Could not upload photo" });
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListPurchasesQueryKey() });

  const createMutation = useCreatePurchase({
    mutation: {
      onSuccess: () => {
        toast({ title: "Purchase recorded", description: form.productName });
        setOpen(false);
        setForm(EMPTY_FORM);
        void invalidate();
      },
      onError: () =>
        toast({ variant: "destructive", title: "Could not save purchase" }),
    },
  });

  const updateMutation = useUpdatePurchase({
    mutation: {
      onSuccess: () => {
        toast({ title: "Purchase updated" });
        setOpen(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        void invalidate();
      },
      onError: () =>
        toast({ variant: "destructive", title: "Could not update purchase" }),
    },
  });

  const deleteMutation = useDeletePurchase({
    mutation: {
      onSuccess: () => {
        toast({ title: "Purchase deleted" });
        setPendingDelete(null);
        void invalidate();
      },
      onError: () =>
        toast({ variant: "destructive", title: "Could not delete purchase" }),
    },
  });

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, purchaseDate: todayISO() });
    setOpen(true);
  }

  function openEdit(p: Purchase) {
    setEditingId(p.id);
    setForm({
      productName: p.productName,
      quantity: String(p.quantity),
      rate: String(p.rate),
      purchaseDate: format(parseISO(p.purchaseDate), "yyyy-MM-dd"),
      imageUrl: p.imageUrl ?? "",
    });
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const productName = form.productName.trim();
    const quantity = Math.max(1, Number(form.quantity) || 1);
    const rate = Number(form.rate);
    if (!productName || !Number.isFinite(rate) || rate < 0) return;
    const purchaseDate = new Date(
      `${form.purchaseDate || todayISO()}T00:00:00`,
    ).toISOString();
    const sku = `P${Date.now().toString(36).slice(-6).toUpperCase()}`;

    const payload = {
      productName,
      sku,
      quantity,
      rate,
      purchaseDate,
      imageUrl: form.imageUrl || undefined,
    };

    if (editingId != null) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Product Purchases
              </CardTitle>
              <CardDescription className="mt-1">
                Recent stock purchases · Total cost{" "}
                <span className="font-medium text-foreground">
                  {isLoading ? "…" : formatINR(totals?.totalCost ?? 0)}
                </span>{" "}
                across{" "}
                <span className="font-medium text-foreground">
                  {isLoading ? "…" : (totals?.totalEntries ?? 0)}
                </span>{" "}
                entries
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" onClick={openAdd}>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/inventory">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ShoppingBag className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                No purchases recorded yet.
              </p>
              <Button size="sm" className="mt-3" onClick={openAdd}>
                <Plus className="mr-1 h-4 w-4" />
                Add your first purchase
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Photo</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <ProductImage
                          src={p.imageUrl}
                          alt={p.productName}
                          className="h-10 w-10 rounded object-cover border"
                          containerClassName="h-10 w-10 rounded"
                          iconClassName="h-4 w-4"
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {p.productName}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.quantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatINR(p.rate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {formatINR(p.total)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {format(parseISO(p.purchaseDate), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(p)}
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
                                id: p.id,
                                productName: p.productName,
                              })
                            }
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
                {editingId != null ? "Edit Purchase" : "Add Purchase"}
              </DialogTitle>
              <DialogDescription>
                {editingId != null
                  ? "Update the purchase details."
                  : "Record a new stock purchase."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="ps-product">Product Name</Label>
                <Input
                  id="ps-product"
                  value={form.productName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, productName: e.target.value }))
                  }
                  placeholder="e.g. Black Chiffon Saree"
                  required
                  autoFocus
                  maxLength={200}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="ps-qty">Quantity</Label>
                  <Input
                    id="ps-qty"
                    type="number"
                    min={1}
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
                  <Label htmlFor="ps-rate">Rate (₹)</Label>
                  <Input
                    id="ps-rate"
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
                <Label htmlFor="ps-date">Purchase Date</Label>
                <Input
                  id="ps-date"
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, purchaseDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Photo (optional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                {form.imageUrl ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={form.imageUrl}
                      alt="preview"
                      className="h-14 w-14 rounded object-cover border"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Replace"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="w-full"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Upload Photo
                  </Button>
                )}
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
                {editingId != null ? "Save Changes" : "Save Purchase"}
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
            <AlertDialogTitle>Delete purchase?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <strong>{pendingDelete?.productName}</strong> from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                pendingDelete &&
                deleteMutation.mutate({ id: pendingDelete.id })
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
    </>
  );
}
