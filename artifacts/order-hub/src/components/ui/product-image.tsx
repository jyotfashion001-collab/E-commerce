import { useState } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  iconClassName?: string;
  containerClassName?: string;
}

export function ProductImage({
  src,
  alt = "Product",
  className,
  iconClassName,
  containerClassName,
}: ProductImageProps) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-muted border rounded",
        containerClassName,
      )}
    >
      <Package className={cn("text-muted-foreground/50", iconClassName)} />
    </div>
  );
}
