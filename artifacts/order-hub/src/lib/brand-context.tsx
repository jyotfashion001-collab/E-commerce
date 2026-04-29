import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setExtraHeadersGetter, useListCompanies } from "@workspace/api-client-react";

export type Brand = string;

export interface BrandSummary {
  slug: Brand;
  name: string;
}

const DEFAULT_COMPANIES: readonly BrandSummary[] = [
  { slug: "feni", name: "Feni Creation" },
  { slug: "ambika", name: "Ambika Creation" },
  { slug: "jyot", name: "Jyot Fashion" },
];

const DEFAULT_BRAND: Brand = DEFAULT_COMPANIES[0]!.slug;

const BRAND_KEY = "orderhub_active_brand";

function readBrand(): Brand {
  try {
    const v = localStorage.getItem(BRAND_KEY);
    if (v && /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(v)) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_BRAND;
}

function writeBrand(brand: Brand) {
  try {
    localStorage.setItem(BRAND_KEY, brand);
  } catch {
    /* ignore */
  }
}

export interface BrandState {
  /** The active brand slug. */
  brand: Brand;
  /** Switch to a different brand (clears all cached data and refetches). */
  setBrand: (b: Brand) => void;
  /** All companies known to the workspace. Falls back to defaults on first load. */
  companies: BrandSummary[];
  /** True while the companies list is being loaded for the first time. */
  loadingCompanies: boolean;
}

export const BrandContext = createContext<BrandState | null>(null);

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brand, setBrandState] = useState<Brand>(() => readBrand());
  const queryClient = useQueryClient();

  // Keep a ref of the current brand so the X-Brand header getter always
  // returns the LATEST value, even if it's read between a state update
  // and the next render commit. This is the key piece that makes brand
  // switching feel instant — no page refresh required.
  const brandRef = useRef(brand);
  brandRef.current = brand;

  useEffect(() => {
    setExtraHeadersGetter(() => ({ "X-Brand": brandRef.current }));
    return () => setExtraHeadersGetter(null);
  }, []);

  // Fetch the dynamic list of companies. This request goes out without
  // an X-Brand header at first, but our middleware doesn't require one
  // for /companies, so it's fine.
  const { data: fetchedCompanies, isLoading: loadingCompanies } = useListCompanies();

  const companies = useMemo<BrandSummary[]>(() => {
    if (Array.isArray(fetchedCompanies) && fetchedCompanies.length > 0) {
      return fetchedCompanies.map((c) => ({ slug: c.slug, name: c.name }));
    }
    return DEFAULT_COMPANIES.slice();
  }, [fetchedCompanies]);

  // If the persisted brand no longer exists in the company list, fall
  // back to the first available one. Only run once real data has loaded —
  // never while fetchedCompanies is undefined — to avoid clearing the
  // companies cache and creating an invalidation loop.
  useEffect(() => {
    if (loadingCompanies || companies.length === 0) return;
    if (!companies.some((c) => c.slug === brand)) {
      const next = companies[0]!.slug;
      brandRef.current = next;
      writeBrand(next);
      setBrandState(next);
      // Preserve the companies cache so this effect does not retrigger.
      queryClient.removeQueries({
        predicate: (q) => {
          const key = q.queryKey?.[0];
          return typeof key === "string" && !key.includes("/companies");
        },
      });
    }
  }, [companies, loadingCompanies, brand, queryClient]);

  const setBrand = useCallback(
    (next: Brand) => {
      if (next === brandRef.current) return;
      // 1. Update the ref synchronously so the header getter is correct
      //    before any refetch fires.
      brandRef.current = next;
      writeBrand(next);
      setBrandState(next);
      // 2. Invalidate brand-specific queries so they refetch in the
      //    background while keeping stale data visible — this avoids
      //    any loading-skeleton flash that feels like a page refresh.
      //    Companies are brand-independent, so leave their cache alone.
      void queryClient.invalidateQueries({
        refetchType: "active",
        predicate: (q) => {
          const key = q.queryKey?.[0];
          return (
            typeof key === "string" &&
            !key.includes("/companies") &&
            !key.includes("/dashboard/all-companies")
          );
        },
      });
    },
    [queryClient],
  );

  const value = useMemo<BrandState>(
    () => ({ brand, setBrand, companies, loadingCompanies }),
    [brand, setBrand, companies, loadingCompanies],
  );
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}
