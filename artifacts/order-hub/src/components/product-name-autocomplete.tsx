import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useListPurchaseProductNames } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ProductNameAutocompleteProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  maxLength?: number;
  "data-testid"?: string;
}

export function ProductNameAutocomplete({
  id,
  value,
  onChange,
  onSelect,
  placeholder,
  required,
  autoFocus,
  disabled,
  maxLength,
  ...rest
}: ProductNameAutocompleteProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [debounced, setDebounced] = useState(value.trim());
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim()), 150);
    return () => clearTimeout(t);
  }, [value]);

  const { data } = useListPurchaseProductNames(
    { search: debounced || undefined, limit: 12 },
    { query: { enabled: open } },
  );

  const suggestions = useMemo(() => {
    const list = (data?.items ?? []).map((s) => s.productName);
    const trimmed = value.trim();
    if (!trimmed) return list;
    const lower = trimmed.toLowerCase();
    return list.filter((n) => n.toLowerCase() !== lower || list.length > 1);
  }, [data, value]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [suggestions.length]);

  const choose = (name: string) => {
    onChange(name);
    onSelect?.(name);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) =>
        suggestions.length === 0
          ? 0
          : Math.min(h + 1, suggestions.length - 1),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && open && suggestions[highlight]) {
      e.preventDefault();
      choose(suggestions[highlight]);
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        id={inputId}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        disabled={disabled}
        maxLength={maxLength}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${inputId}-listbox`}
        {...rest}
      />
      {open && suggestions.length > 0 && (
        <div
          id={`${inputId}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          {suggestions.map((name, idx) => (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={idx === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(name);
              }}
              onMouseEnter={() => setHighlight(idx)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                idx === highlight
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/60"
              }`}
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
