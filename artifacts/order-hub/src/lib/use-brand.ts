import { useContext } from "react";
import { BrandContext, type BrandState } from "./brand-context";

export function useBrand(): BrandState {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrand must be used inside BrandProvider");
  return ctx;
}
