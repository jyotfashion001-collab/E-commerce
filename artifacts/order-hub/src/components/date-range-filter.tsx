import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

export type DateRangeValue = {
  from?: Date;
  to?: Date;
  preset?: "all" | "today" | "yesterday" | "last3" | "last7" | "custom";
};

const PRESETS: Array<{ id: NonNullable<DateRangeValue["preset"]>; label: string }> = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last3", label: "Last 3 days" },
  { id: "last7", label: "Last 7 days" },
  { id: "custom", label: "Custom date range" },
];

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function endOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(23, 59, 59, 999);
  return c;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function rangeFromPreset(preset: NonNullable<DateRangeValue["preset"]>): {
  from: Date;
  to: Date;
} | null {
  const today = startOfDay(new Date());
  switch (preset) {
    case "all":
      return null;
    case "today":
      return { from: today, to: endOfDay(today) };
    case "yesterday": {
      const y = addDays(today, -1);
      return { from: y, to: endOfDay(y) };
    }
    case "last3":
      return { from: addDays(today, -2), to: endOfDay(today) };
    case "last7":
      return { from: addDays(today, -6), to: endOfDay(today) };
    case "custom":
      return null;
  }
}

function summarize(value: DateRangeValue, label: string): string {
  if (value.preset && value.preset !== "custom") {
    return PRESETS.find((p) => p.id === value.preset)?.label ?? label;
  }
  if (!value.from && !value.to) return label;
  if (value.from && value.to) {
    const fromStr = format(value.from, "MMM d");
    const toStr = format(value.to, "MMM d, yyyy");
    return `${fromStr} – ${toStr}`;
  }
  if (value.from) return `From ${format(value.from, "MMM d, yyyy")}`;
  if (value.to) return `Until ${format(value.to, "MMM d, yyyy")}`;
  return label;
}

interface DateRangeFilterProps {
  label?: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
}

export function DateRangeFilter({
  label = "Order Date",
  value,
  onChange,
  className,
}: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [draftPreset, setDraftPreset] = useState<DateRangeValue["preset"]>(
    value.preset ?? (value.from || value.to ? "custom" : undefined),
  );
  const [draftFrom, setDraftFrom] = useState<Date | undefined>(value.from);
  const [draftTo, setDraftTo] = useState<Date | undefined>(value.to);

  useEffect(() => {
    if (open) {
      setDraftPreset(value.preset ?? (value.from || value.to ? "custom" : undefined));
      setDraftFrom(value.from);
      setDraftTo(value.to);
    }
  }, [open, value]);

  const selectPreset = (id: NonNullable<DateRangeValue["preset"]>) => {
    setDraftPreset(id);
    if (id === "custom") {
      setOpen(false);
      setCustomOpen(true);
      return;
    }
    const range = rangeFromPreset(id);
    if (range) {
      setDraftFrom(range.from);
      setDraftTo(range.to);
    }
  };

  const handleApply = () => {
    if (!draftPreset) {
      onChange({});
    } else if (draftPreset === "custom") {
      onChange({
        preset: "custom",
        from: draftFrom ? startOfDay(draftFrom) : undefined,
        to: draftTo ? endOfDay(draftTo) : undefined,
      });
    } else {
      const range = rangeFromPreset(draftPreset);
      onChange({
        preset: draftPreset,
        from: range?.from,
        to: range?.to,
      });
    }
    setOpen(false);
  };

  const handleClear = () => {
    setDraftPreset(undefined);
    setDraftFrom(undefined);
    setDraftTo(undefined);
    onChange({});
    setOpen(false);
  };

  const handleCustomApply = (range: { from?: Date; to?: Date }) => {
    onChange({
      preset: "custom",
      from: range.from ? startOfDay(range.from) : undefined,
      to: range.to ? endOfDay(range.to) : undefined,
    });
    setCustomOpen(false);
  };

  const hasFilter = Boolean(value.from || value.to);
  const triggerLabel = summarize(value, label);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "gap-2 justify-between font-normal min-w-[180px]",
              hasFilter && "border-primary/40 text-foreground",
              className,
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{triggerLabel}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r bg-muted/30 p-2 flex flex-col gap-1 min-w-[140px]">
              <div
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md cursor-default",
                  "bg-background border",
                )}
              >
                {label}
              </div>
            </div>
            <div className="p-4 min-w-[280px] space-y-3">
              <div className="space-y-2">
                {PRESETS.map((preset) => {
                  const active = draftPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => selectPreset(preset.id)}
                      className="flex items-center gap-3 w-full text-left text-sm py-1.5 hover:text-foreground"
                    >
                      <span
                        className={cn(
                          "h-4 w-4 rounded-full border flex items-center justify-center transition-colors",
                          active ? "border-primary" : "border-muted-foreground/40",
                        )}
                      >
                        {active && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </span>
                      <span className={cn(active ? "text-foreground" : "text-muted-foreground")}>
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-2">
            <Button variant="link" size="sm" className="px-0 text-primary" onClick={handleClear}>
              Clear Filter
            </Button>
            <Button size="sm" onClick={handleApply} disabled={!draftPreset || draftPreset === "custom"}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <CustomRangeDialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        initialFrom={draftFrom}
        initialTo={draftTo}
        onApply={handleCustomApply}
      />
    </>
  );
}

interface CustomRangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFrom?: Date;
  initialTo?: Date;
  onApply: (range: { from?: Date; to?: Date }) => void;
}

function CustomRangeDialog({
  open,
  onOpenChange,
  initialFrom,
  initialTo,
  onApply,
}: CustomRangeDialogProps) {
  const [range, setRange] = useState<DateRange | undefined>(
    initialFrom || initialTo ? { from: initialFrom, to: initialTo } : undefined,
  );

  useEffect(() => {
    if (open) {
      setRange(
        initialFrom || initialTo ? { from: initialFrom, to: initialTo } : undefined,
      );
    }
  }, [open, initialFrom, initialTo]);

  const fromText = range?.from ? format(range.from, "dd MMM ''yy") : "";
  const toText = range?.to ? format(range.to, "dd MMM ''yy") : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden">
        <DialogTitle className="sr-only">Select custom date range</DialogTitle>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border px-3 pt-2 pb-2.5">
              <div className="text-xs text-muted-foreground">From</div>
              <div className="text-sm font-medium text-foreground min-h-[20px]">
                {fromText || <span className="text-muted-foreground/60">Select date</span>}
              </div>
            </div>
            <div className="rounded-md border px-3 pt-2 pb-2.5">
              <div className="text-xs text-muted-foreground">To</div>
              <div className="text-sm font-medium text-foreground min-h-[20px]">
                {toText || <span className="text-muted-foreground/60">Select date</span>}
              </div>
            </div>
          </div>

          <div className="rounded-md border p-3">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={1}
              defaultMonth={range?.from ?? new Date()}
              className="w-full [--cell-size:2.4rem]"
            />
          </div>
        </div>
        <div className="flex items-center justify-start gap-2 border-t px-5 py-3 bg-background">
          <Button
            onClick={() => onApply({ from: range?.from, to: range?.to })}
            disabled={!range?.from || !range?.to}
          >
            Apply
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
