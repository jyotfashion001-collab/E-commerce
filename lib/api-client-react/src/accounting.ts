import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { ErrorType } from "./custom-fetch";

export interface AccountingProductRow {
  sku: string;
  productName: string;
  platform: string;
  totalRevenue: number;
  unitsSold: number;
  orderCount: number;
  avgRate: number;
  lastRate: number;
  stockQty: number;
  imageUrl: string | null;
  mrp: number | null;
  totalMrp: number | null;
}

export interface AccountingSummary {
  totalRevenue: number;
  totalOrders: number;
  totalUnits: number;
  distinctProducts: number;
}

export interface AccountingProductPage {
  items: AccountingProductRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: AccountingSummary;
}

export interface ListAccountingParams {
  platform?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
}

export const getListAccountingProductsUrl = (params?: ListAccountingParams) => {
  const qs = new URLSearchParams();
  if (params?.platform && params.platform !== "all") qs.set("platform", params.platform);
  if (params?.search) qs.set("search", params.search);
  if (params?.page != null) qs.set("page", String(params.page));
  if (params?.pageSize != null) qs.set("pageSize", String(params.pageSize));
  if (params?.sortBy) qs.set("sortBy", params.sortBy);
  if (params?.sortOrder) qs.set("sortOrder", params.sortOrder);
  if (params?.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params?.dateTo) qs.set("dateTo", params.dateTo);
  const q = qs.toString();
  return `/api/accounting/product-summary${q ? `?${q}` : ""}`;
};

export const listAccountingProducts = async (
  params?: ListAccountingParams,
  options?: RequestInit,
): Promise<AccountingProductPage> => {
  return customFetch<AccountingProductPage>(getListAccountingProductsUrl(params), {
    ...options,
    method: "GET",
  });
};

export const getListAccountingProductsQueryKey = (params?: ListAccountingParams) =>
  [`/api/accounting/product-summary`, ...(params ? [params] : [])] as const;

export const useListAccountingProducts = <
  TData = AccountingProductPage,
  TError = ErrorType<unknown>,
>(
  params?: ListAccountingParams,
  options?: {
    query?: UseQueryOptions<AccountingProductPage, TError, TData>;
  },
): UseQueryResult<TData, TError> => {
  const queryKey = getListAccountingProductsQueryKey(params);
  const query = useQuery({
    queryFn: () => listAccountingProducts(params),
    queryKey,
    ...options?.query,
  });
  return query as UseQueryResult<TData, TError>;
};
