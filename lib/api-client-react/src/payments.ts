import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { ErrorType } from "./custom-fetch";

export type PaymentPlatform = "meesho" | "flipkart" | "amazon";

export type PaymentReview = "pending" | "success";

export interface PaymentRow {
  id: number;
  brand: string;
  platform: PaymentPlatform;
  paymentReview: PaymentReview;
  subOrderNo: string;
  orderDate: string;
  dispatchDate: string;
  productName: string;
  sku: string;
  catalogId: string;
  orderSource: string;
  liveOrderStatus: string;
  productGstPct: string;
  listingPrice: string;
  quantity: string;
  transactionId: string;
  paymentDate: string;
  finalSettlementAmount: string;
  priceType: string;
  totalSaleAmount: string;
  totalSaleReturnAmount: string;
  fixedFee: string;
  warehousingFee: string;
  returnPremium: string;
  returnPremiumOfReturn: string;
  meeshoCommissionPct: string;
  meeshoCommission: string;
  meeshoGoldPlatformFee: string;
  meeshoMallPlatformFee: string;
  fixedFee2: string;
  warehousingFee2: string;
  returnShippingCharge: string;
  gstCompensation: string;
  shippingCharge: string;
  otherSupportServiceCharges: string;
  waivers: string;
  netOtherSupportServiceCharges: string;
  gstOnNetOtherSupportServiceCharges: string;
  tcs: string;
  tdsRatePct: string;
  tds: string;
  compensation: string;
  claims: string;
  recovery: string;
  compensationReason: string;
  claimsReason: string;
  recoveryReason: string;
  productRate: number;
}

export interface PaymentsSummary {
  count: number;
  settlement: number;
  saleAmount: number;
  commission: number;
  shipping: number;
  shippingForward: number;
  shippingReturn: number;
  tds: number;
  tcs: number;
  compensation: number;
  claims: number;
  recovery: number;
  successCount: number;
  successAmount: number;
  pendingCount: number;
  pendingAmount: number;
  rtoCount: number;
  rtoAmount: number;
  returnCount: number;
  returnAmount: number;
  returnSettlement: number;
}

export interface PaymentsPage {
  items: PaymentRow[];
  total: number;
  totalAll: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: PaymentsSummary;
  facets: {
    statuses: string[];
    sources: string[];
  };
}

export interface ListPaymentsParams {
  platform?: string;
  search?: string;
  status?: string;
  source?: string;
  paymentReview?: string;
  page?: number;
  pageSize?: number;
  orderDateFrom?: string;
  orderDateTo?: string;
  paymentDateFrom?: string;
  paymentDateTo?: string;
}

export const getListPaymentsUrl = (params?: ListPaymentsParams) => {
  const qs = new URLSearchParams();
  if (params?.platform && params.platform !== "all") qs.set("platform", params.platform);
  if (params?.search) qs.set("search", params.search);
  if (params?.status && params.status !== "all") qs.set("status", params.status);
  if (params?.source && params.source !== "all") qs.set("source", params.source);
  if (params?.paymentReview && params.paymentReview !== "all")
    qs.set("paymentReview", params.paymentReview);
  if (params?.page != null) qs.set("page", String(params.page));
  if (params?.pageSize != null) qs.set("pageSize", String(params.pageSize));
  if (params?.orderDateFrom) qs.set("orderDateFrom", params.orderDateFrom);
  if (params?.orderDateTo) qs.set("orderDateTo", params.orderDateTo);
  if (params?.paymentDateFrom) qs.set("paymentDateFrom", params.paymentDateFrom);
  if (params?.paymentDateTo) qs.set("paymentDateTo", params.paymentDateTo);
  const q = qs.toString();
  return `/api/payments${q ? `?${q}` : ""}`;
};

export const listPayments = async (
  params?: ListPaymentsParams,
  options?: RequestInit,
): Promise<PaymentsPage> =>
  customFetch<PaymentsPage>(getListPaymentsUrl(params), {
    ...options,
    method: "GET",
  });

export const getListPaymentsQueryKey = (params?: ListPaymentsParams) =>
  [`/api/payments`, ...(params ? [params] : [])] as const;

export const useListPayments = <
  TData = PaymentsPage,
  TError = ErrorType<unknown>,
>(
  params?: ListPaymentsParams,
  options?: { query?: UseQueryOptions<PaymentsPage, TError, TData> },
): UseQueryResult<TData, TError> => {
  const queryKey = getListPaymentsQueryKey(params);
  const query = useQuery({
    queryFn: () => listPayments(params),
    queryKey,
    ...options?.query,
  });
  return query as UseQueryResult<TData, TError>;
};

export interface UploadPaymentsBody {
  rows: Array<Partial<Omit<PaymentRow, "id" | "brand">> & { platform: PaymentPlatform }>;
}

export interface UploadPaymentsResult {
  inserted: number;
  updated: number;
  skipped: number;
  deduped: number;
  errors: string[];
}

export const uploadPayments = async (
  body: UploadPaymentsBody,
): Promise<UploadPaymentsResult> =>
  customFetch<UploadPaymentsResult>(`/api/payments/upload`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

export const useUploadPayments = <
  TError = ErrorType<unknown>,
  TContext = unknown,
>(options?: {
  mutation?: UseMutationOptions<
    UploadPaymentsResult,
    TError,
    { data: UploadPaymentsBody },
    TContext
  >;
}): UseMutationResult<
  UploadPaymentsResult,
  TError,
  { data: UploadPaymentsBody },
  TContext
> =>
  useMutation({
    mutationFn: ({ data }) => uploadPayments(data),
    ...options?.mutation,
  });

export interface UpdatePaymentBody {
  paymentReview?: "" | "pending" | "success";
  subOrderNo?: string;
  orderDate?: string;
  productName?: string;
  sku?: string;
  liveOrderStatus?: string;
  orderSource?: string;
  quantity?: string;
  paymentDate?: string;
  priceType?: string;
  finalSettlementAmount?: string;
  totalSaleAmount?: string;
  totalSaleReturnAmount?: string;
  meeshoCommission?: string;
  shippingCharge?: string;
  returnShippingCharge?: string;
  tcs?: string;
  tds?: string;
}

export const updatePayment = async (
  id: number,
  body: UpdatePaymentBody,
): Promise<PaymentRow> =>
  customFetch<PaymentRow>(`/api/payments/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

export const useUpdatePayment = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: {
    mutation?: UseMutationOptions<
      PaymentRow,
      TError,
      { id: number; data: UpdatePaymentBody },
      TContext
    >;
  },
): UseMutationResult<
  PaymentRow,
  TError,
  { id: number; data: UpdatePaymentBody },
  TContext
> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updatePayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payments`] });
    },
    ...options?.mutation,
  });
};

export const clearPayments = async (): Promise<{ deleted: number }> =>
  customFetch<{ deleted: number }>(`/api/payments`, { method: "DELETE" });

export const useClearPayments = <TError = ErrorType<unknown>>(options?: {
  mutation?: UseMutationOptions<{ deleted: number }, TError, void>;
}): UseMutationResult<{ deleted: number }, TError, void> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearPayments(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payments`] });
    },
    ...options?.mutation,
  });
};

export const deletePayments = async (
  ids: number[],
): Promise<{ deleted: number }> =>
  customFetch<{ deleted: number }>(`/api/payments/delete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ids }),
  });

export const useDeletePayments = <TError = ErrorType<unknown>>(options?: {
  mutation?: UseMutationOptions<{ deleted: number }, TError, { ids: number[] }>;
}): UseMutationResult<{ deleted: number }, TError, { ids: number[] }> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids }) => deletePayments(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/payments`] });
    },
    ...options?.mutation,
  });
};

export interface PlatformPaymentSummary {
  totalOrders: number;
  successCount: number;
  successAmount: number;
  pendingCount: number;
  pendingAmount: number;
  rtoCount: number;
  rtoAmount: number;
  returnCount: number;
  returnAmount: number;
  returnSettlement: number;
  compensation: number;
  claims: number;
  recovery: number;
}

export interface PaymentPlatformSummaryResponse {
  all: PlatformPaymentSummary;
  platforms: Array<{ platform: PaymentPlatform } & PlatformPaymentSummary>;
}

export const getPaymentPlatformSummary = async (): Promise<PaymentPlatformSummaryResponse> =>
  customFetch<PaymentPlatformSummaryResponse>(`/api/payments/platform-summary`, { method: "GET" });

export const useGetPaymentPlatformSummary = <
  TData = PaymentPlatformSummaryResponse,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<PaymentPlatformSummaryResponse, TError, TData>;
}): UseQueryResult<TData, TError> => {
  const queryKey = [`/api/payments/platform-summary`] as const;
  return useQuery({
    queryFn: () => getPaymentPlatformSummary(),
    queryKey,
    ...options?.query,
  }) as UseQueryResult<TData, TError>;
};

export interface AllCompaniesPlatformSummaryResponse {
  all: PlatformPaymentSummary;
}

export const getAllCompaniesPlatformSummary =
  async (): Promise<AllCompaniesPlatformSummaryResponse> =>
    customFetch<AllCompaniesPlatformSummaryResponse>(
      `/api/payments/all-companies-platform-summary`,
      { method: "GET" },
    );

export const useGetAllCompaniesPlatformSummary = <
  TData = AllCompaniesPlatformSummaryResponse,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<AllCompaniesPlatformSummaryResponse, TError, TData>;
}): UseQueryResult<TData, TError> => {
  const queryKey = [`/api/payments/all-companies-platform-summary`] as const;
  return useQuery({
    queryFn: () => getAllCompaniesPlatformSummary(),
    queryKey,
    ...options?.query,
  }) as UseQueryResult<TData, TError>;
};
