import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  useGetInventoryItem,
  useDeleteInventoryItem,
  getListInventoryQueryKey,
  getGetInventoryItemQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatINR } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trash, Edit } from "lucide-react";
import { ProductImage } from "@/components/ui/product-image";

const PLATFORM_COLORS: Record<string, string> = {
  meesho: "bg-[#e83e8c]/10 text-[#e83e8c] border-[#e83e8c]/20",
  flipkart: "bg-[#007bff]/10 text-[#007bff] border-[#007bff]/20",
  amazon: "bg-[#fd7e14]/10 text-[#fd7e14] border-[#fd7e14]/20",
};

export default function Product() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading, isError, error } = useGetInventoryItem(
    Number.isFinite(id) ? id : 0,
  );

  const deleteMutation = useDeleteInventoryItem({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListInventoryQueryKey() });
        queryClient.invalidateQueries({
          queryKey: getGetInventoryItemQueryKey(id),
        });
        toast({ title: "Item deleted" });
        navigate("/product-purchase");
      },
      onError: (err) => {
        toast({
          title: "Failed to delete item",
          description: err.message,
          variant: "destructive",
        });
      },
    },
  });

  if (!Number.isFinite(id)) {
    return (
      <div className="space-y-4">
        <BackButton />
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Invalid product id.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <BackButton />
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-64" />
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-[280px_1fr]">
            <Skeleton className="h-64 w-full rounded-md" />
            <div className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <BackButton />
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            {error?.message ?? "Product not found."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const item = data as typeof data & {
    originalPrice?: number | null;
    gstPercent?: number | null;
    imageUrl?: string | null;
    imageUrls?: string[] | null;
  };

  const gallery: string[] =
    item.imageUrls && item.imageUrls.length > 0
      ? item.imageUrls
      : item.imageUrl
      ? [item.imageUrl]
      : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <BackButton />
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/product-purchase">
              <Edit className="mr-2 h-4 w-4" /> Manage in inventory
            </Link>
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Are you sure you want to delete this item?")) {
                deleteMutation.mutate({ id: item.id });
              }
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash className="mr-2 h-4 w-4" />
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`capitalize ${PLATFORM_COLORS[item.platform] || ""}`}
            >
              {item.platform}
            </Badge>
            <span className="text-sm text-muted-foreground">SKU: {item.sku}</span>
          </div>
          <CardTitle className="text-2xl">{item.productName}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-8 md:grid-cols-[280px_1fr]">
          <ProductGallery
            images={gallery}
            productName={item.productName}
          />

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <Field label="Selling rate" value={formatINR(item.price)} />
              <Field
                label="MRP"
                value={
                  item.originalPrice != null
                    ? formatINR(item.originalPrice)
                    : "—"
                }
              />
              <Field
                label="GST"
                value={item.gstPercent != null ? `${item.gstPercent}%` : "—"}
              />
              <Field
                label="Stock"
                value={
                  <Badge
                    variant={item.quantity <= 10 ? "destructive" : "secondary"}
                  >
                    {item.quantity} units
                  </Badge>
                }
              />
            </div>

            <div className="border-t pt-4 text-sm text-muted-foreground">
              Last updated{" "}
              {format(parseISO(item.updatedAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BackButton() {
  return (
    <Button variant="ghost" asChild>
      <Link to="/product-purchase">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to inventory
      </Link>
    </Button>
  );
}

function ProductGallery({
  images,
  productName,
}: {
  images: string[];
  productName: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  if (images.length === 0) {
    return (
      <div>
        <div className="w-full aspect-square rounded-md border bg-muted flex items-center justify-center">
          <Package className="h-16 w-16 text-muted-foreground/40" />
        </div>
      </div>
    );
  }
  const safeIdx = Math.min(activeIdx, images.length - 1);
  return (
    <div className="space-y-3">
      <ProductImage
        src={images[safeIdx]}
        alt={productName}
        className="w-full aspect-square object-cover rounded-md border"
        containerClassName="w-full aspect-square rounded-md"
        iconClassName="h-12 w-12"
      />
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((url, idx) => (
            <button
              key={`${url}-${idx}`}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={`aspect-square rounded border overflow-hidden ${
                idx === safeIdx ? "ring-2 ring-primary" : ""
              }`}
            >
              <ProductImage
                src={url}
                alt={`${productName} ${idx + 1}`}
                className="h-full w-full object-cover"
                containerClassName="h-full w-full"
                iconClassName="h-5 w-5"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-base font-medium">{value}</div>
    </div>
  );
}
