import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
export const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, gcTime: 10 * 60_000, retry: (count, error) => !(error instanceof ApiError && [400,401,403,404,422].includes(error.status || 0)) && count < 2, refetchOnWindowFocus: false }, mutations: { retry: false } } });
