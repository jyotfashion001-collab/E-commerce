import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";
import type { ErrorType } from "./custom-fetch";

export interface AllCompaniesPurchaseSummaryResponse {
  totalCost: number;
  totalUnits: number;
  totalEntries: number;
}

export const getAllCompaniesPurchaseSummary =
  async (): Promise<AllCompaniesPurchaseSummaryResponse> =>
    customFetch<AllCompaniesPurchaseSummaryResponse>(
      `/api/purchases/all-companies-summary`,
      { method: "GET" },
    );

export const useGetAllCompaniesPurchaseSummary = <
  TData = AllCompaniesPurchaseSummaryResponse,
  TError = ErrorType<unknown>,
>(options?: {
  query?: UseQueryOptions<AllCompaniesPurchaseSummaryResponse, TError, TData>;
}): UseQueryResult<TData, TError> => {
  const queryKey = [`/api/purchases/all-companies-summary`] as const;
  return useQuery({
    queryFn: () => getAllCompaniesPurchaseSummary(),
    queryKey,
    ...options?.query,
  }) as UseQueryResult<TData, TError>;
};
