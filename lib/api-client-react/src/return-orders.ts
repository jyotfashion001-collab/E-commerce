import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { ErrorType } from "./custom-fetch";

export type ReturnPlatform = "meesho" | "flipkart" | "amazon";

export interface ReturnOrderRow {
  id: number;
  brand: string;
  platform: ReturnPlatform;
  sku: string;
  qty: string;
  orderNumber: string;
  returnCreatedDate: string;
  typeOfReturn: string;
  expectedDeliveryDate: string;
  courierPartner: string;
  status: string;
  trackingLink: string;
  returnPriceType: string;
}

export interface ReturnOrdersPage {
  items: ReturnOrderRow[];
  total: number;
  totalAll: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    statuses: string[];
    types: string[];
  };
}

export interface ListReturnOrdersParams {
  platform?: string;
  search?: string;
  status?: string;
  typeOfReturn?: string;
  page?: number;
  pageSize?: number;
}

export const getListReturnOrdersUrl = (params?: ListReturnOrdersParams) => {
  const qs = new URLSearchParams();
  if (params?.platform && params.platform !== "all") qs.set("platform", params.platform);
  if (params?.search) qs.set("search", params.search);
  if (params?.status && params.status !== "all") qs.set("status", params.status);
  if (params?.typeOfReturn && params.typeOfReturn !== "all")
    qs.set("typeOfReturn", params.typeOfReturn);
  if (params?.page != null) qs.set("page", String(params.page));
  if (params?.pageSize != null) qs.set("pageSize", String(params.pageSize));
  const q = qs.toString();
  return `/api/return-orders${q ? `?${q}` : ""}`;
};

export const listReturnOrders = async (
  params?: ListReturnOrdersParams,
  options?: RequestInit,
): Promise<ReturnOrdersPage> => {
  return customFetch<ReturnOrdersPage>(getListReturnOrdersUrl(params), {
    ...options,
    method: "GET",
  });
};

export const getListReturnOrdersQueryKey = (params?: ListReturnOrdersParams) =>
  [`/api/return-orders`, ...(params ? [params] : [])] as const;

export const useListReturnOrders = <
  TData = ReturnOrdersPage,
  TError = ErrorType<unknown>,
>(
  params?: ListReturnOrdersParams,
  options?: { query?: UseQueryOptions<ReturnOrdersPage, TError, TData> },
): UseQueryResult<TData, TError> => {
  const queryKey = getListReturnOrdersQueryKey(params);
  const query = useQuery({
    queryFn: () => listReturnOrders(params),
    queryKey,
    ...options?.query,
  });
  return query as UseQueryResult<TData, TError>;
};

export interface UploadReturnOrdersBody {
  rows: Array<{
    platform: ReturnPlatform;
    sku: string;
    qty: string;
    orderNumber: string;
    returnCreatedDate: string;
    typeOfReturn: string;
    expectedDeliveryDate: string;
    courierPartner: string;
    status: string;
    trackingLink: string;
    returnPriceType: string;
  }>;
}

export interface UploadReturnOrdersResult {
  inserted: number;
  updated: number;
  skipped: number;
  cancelled: number;
  errors: string[];
}

export const uploadReturnOrders = async (
  body: UploadReturnOrdersBody,
): Promise<UploadReturnOrdersResult> =>
  customFetch<UploadReturnOrdersResult>(`/api/return-orders/upload`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

export const useUploadReturnOrders = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    UploadReturnOrdersResult,
    TError,
    { data: UploadReturnOrdersBody },
    TContext
  >;
}): UseMutationResult<
  UploadReturnOrdersResult,
  TError,
  { data: UploadReturnOrdersBody },
  TContext
> => {
  return useMutation({
    mutationFn: ({ data }) => uploadReturnOrders(data),
    ...options?.mutation,
  });
};

export const clearReturnOrders = async (): Promise<{ deleted: number }> =>
  customFetch<{ deleted: number }>(`/api/return-orders`, { method: "DELETE" });

export const useClearReturnOrders = <TError = ErrorType<unknown>>(options?: {
  mutation?: UseMutationOptions<{ deleted: number }, TError, void>;
}): UseMutationResult<{ deleted: number }, TError, void> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearReturnOrders(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/return-orders`] });
    },
    ...options?.mutation,
  });
};
