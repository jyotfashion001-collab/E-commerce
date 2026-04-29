import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  className?: string;
}

const DEFAULT_OPTIONS = [10, 25, 50, 100];

export function DataTablePagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_OPTIONS,
  itemName = "rows",
  className = "",
}: DataTablePaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const safeTotalPages = Math.max(1, totalPages);
  const isFirst = page <= 1;
  const isLast = page >= safeTotalPages;

  return (
    <div
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span>
          Showing <span className="font-medium text-foreground">{start}</span> to{" "}
          <span className="font-medium text-foreground">{end}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span> {itemName}
        </span>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-[78px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={isFirst}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <div className="text-sm font-medium px-2 whitespace-nowrap">
          Page {page} of {safeTotalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={isLast}
          onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
