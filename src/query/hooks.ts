import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService, authService, bookingService, paymentService, publicService } from "@/api/services";
import { qk } from "@/query/keys";
import { useAuthStore } from "@/store/auth";
import type { ListParams, SearchFlightsPayload } from "@/types/api";

export function useAuthBootstrap() {
  const { accessToken, hasHydrated, setUser, clearSession } = useAuthStore();
  return useQuery({ queryKey: qk.me, queryFn: async () => { try { const result = await authService.me(); setUser(result.data.user); return result.data.user; } catch (error) { clearSession(); throw error; } }, enabled: hasHydrated && Boolean(accessToken), retry: false, staleTime: 5 * 60_000, placeholderData: useAuthStore.getState().user || undefined });
}
export const usePopularRoutes = () => useQuery({ queryKey: qk.popularRoutes, queryFn: publicService.popularRoutes, staleTime: 10 * 60_000 });
export const useAirportSearch = (q: string) => useQuery({ queryKey: qk.airports(q), queryFn: ({ signal }) => publicService.airports(q, signal), enabled: q.trim().length >= 2, staleTime: 30 * 60_000 });
export const useFlightSearch = (payload: SearchFlightsPayload | null) => useQuery({ queryKey: qk.flightSearch(payload), queryFn: () => publicService.searchFlights(payload!), enabled: Boolean(payload), staleTime: 60_000 });
export const useMyRequests = (params: ListParams) => useQuery({ queryKey: qk.myRequests(params), queryFn: () => bookingService.mine(params) });
export const useBookingRequest = (reference: string, email?: string, enabled = true) => useQuery({ queryKey: qk.request(reference, email), queryFn: () => bookingService.detail(reference, email), enabled: enabled && Boolean(reference) });
export const useMessages = (reference: string, email?: string) => useQuery({ queryKey: qk.messages(reference), queryFn: () => bookingService.messages(reference, { page: 1, limit: 50, email }), enabled: Boolean(reference), refetchInterval: 20_000 });
export const usePaymentMethods = (country: string, currency: string, enabled = true) => useQuery({ queryKey: qk.paymentMethods(country, currency), queryFn: () => paymentService.methods(country, currency), enabled });
export const usePaymentStatus = (reference: string) => useQuery({ queryKey: qk.payment(reference), queryFn: () => paymentService.status(reference), enabled: Boolean(reference), refetchInterval: (query) => ["pending", "processing"].includes(query.state.data?.data.payment.status || "") ? 3000 : false });

export function useInvalidateRequest(reference: string) { const qc = useQueryClient(); return () => Promise.all([qc.invalidateQueries({ queryKey: qk.request(reference) }), qc.invalidateQueries({ queryKey: qk.messages(reference) }), qc.invalidateQueries({ queryKey: ["booking-requests", "mine"] })]); }
export const useAdminDashboard = () => useQuery({ queryKey: qk.adminDashboard, queryFn: adminService.dashboard });
export const useAdminRequests = (params: ListParams) => useQuery({ queryKey: qk.adminRequests(params), queryFn: () => adminService.requests(params) });
export const useAdminRequest = (reference: string) => useQuery({ queryKey: qk.adminRequest(reference), queryFn: () => adminService.request(reference), enabled: Boolean(reference) });
export const useAdminBookings = (params: ListParams) => useQuery({ queryKey: qk.adminBookings(params), queryFn: () => adminService.bookings(params) });
export const useAdminBooking = (reference: string) => useQuery({ queryKey: qk.adminBooking(reference), queryFn: () => adminService.booking(reference), enabled: Boolean(reference) });
export const useAdminCustomers = (params: ListParams) => useQuery({ queryKey: qk.adminCustomers(params), queryFn: () => adminService.customers(params) });
export const useAdminCustomer = (id: string) => useQuery({ queryKey: qk.adminCustomer(id), queryFn: () => adminService.customer(id), enabled: Boolean(id) });
export const useAdminEnquiries = (params: ListParams) => useQuery({ queryKey: qk.adminEnquiries(params), queryFn: () => adminService.enquiries(params) });
export const useAdminUsers = (params: ListParams) => useQuery({ queryKey: qk.adminUsers(params), queryFn: () => adminService.users(params) });
export const useAdminUnread = () => useQuery({ queryKey: qk.adminUnread, queryFn: adminService.unreadMessages, refetchInterval: 30_000 });
export function useApiMutation<TData, TVariables>(mutationFn: (variables: TVariables) => Promise<TData>) { return useMutation({ mutationFn }); }
