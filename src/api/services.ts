import { apiClient } from "@/api/client";
import type { ApiEnvelope, Airport, AuthData, Booking, BookingRequestDetail, BookingRequestSummary, CreateBookingRequestPayload, Customer, DashboardData, Enquiry, FlightSearchData, ListParams, Message, Payment, PaymentCreateData, PaymentGateway, PaymentMethod, PopularRoute, SearchFlightsPayload, User } from "@/types/api";

const query = <T extends object>(params?: T) => ({ params });
const idem = (key: string) => ({ headers: { "Idempotency-Key": key } });

export const authService = {
  register: (payload: { name: string; email: string; phone: string; password: string; country: string }) => apiClient.post<ApiEnvelope<AuthData>>("/auth/register", payload).then(r => r.data),
  login: (payload: { email: string; password: string }) => apiClient.post<ApiEnvelope<AuthData>>("/auth/login", payload).then(r => r.data),
  me: () => apiClient.get<ApiEnvelope<{ user: User }>>("/auth/me").then(r => r.data),
  logout: () => apiClient.post<ApiEnvelope<Record<string, never>>>("/auth/logout").then(r => r.data),
  forgot: (email: string) => apiClient.post<ApiEnvelope<Record<string, never>>>("/auth/forgot-password", { email }).then(r => r.data),
  reset: (payload: { token: string; password: string }) => apiClient.post<ApiEnvelope<Record<string, never>>>("/auth/reset-password", payload).then(r => r.data),
  verify: (token: string) => apiClient.get<ApiEnvelope<Record<string, never>>>("/auth/verify-email", query({ token })).then(r => r.data),
};

export const publicService = {
  airports: (q: string, signal?: AbortSignal) => apiClient.get<ApiEnvelope<{ airports: Airport[] }>>("/airports", { params: { q }, signal }).then(r => r.data),
  popularRoutes: () => apiClient.get<ApiEnvelope<{ routes: PopularRoute[] }>>("/routes/popular").then(r => r.data),
  searchFlights: (payload: SearchFlightsPayload) => apiClient.post<ApiEnvelope<FlightSearchData>>("/flights/search", payload).then(r => r.data),
  enquiry: (payload: { name: string; email: string; phone: string; subject: string; message: string; source: "landing" | "portal" }) => apiClient.post<ApiEnvelope<{ enquiryId: string }>>("/enquiries", payload).then(r => r.data),
};

export const bookingService = {
  create: (payload: CreateBookingRequestPayload, key: string) => apiClient.post<ApiEnvelope<{ bookingRequest: { id: string; reference: string; status: string; trackingUrl: string; createdAt: string } }>>("/booking-requests", payload, idem(key)).then(r => r.data),
  mine: (params: ListParams) => apiClient.get<ApiEnvelope<{ requests: BookingRequestSummary[] }>>("/booking-requests/my", query(params)).then(r => r.data),
  detail: (reference: string, email?: string) => apiClient.get<ApiEnvelope<{ bookingRequest: BookingRequestDetail }>>(`/booking-requests/${reference}`, query(email ? { email } : undefined)).then(r => r.data),
  cancel: (reference: string) => apiClient.patch<ApiEnvelope<Record<string, never>>>(`/booking-requests/${reference}/cancel`).then(r => r.data),
  requestChange: (reference: string, message: string) => apiClient.post<ApiEnvelope<{ message: Message }>>(`/booking-requests/${reference}/change-request`, { message }).then(r => r.data),
  messages: (reference: string, params: ListParams & { email?: string }) => apiClient.get<ApiEnvelope<{ messages: Message[] }>>(`/booking-requests/${reference}/messages`, query(params)).then(r => r.data),
  sendMessage: (reference: string, body: string) => apiClient.post<ApiEnvelope<{ message: Message }>>(`/booking-requests/${reference}/messages`, { body }).then(r => r.data),
};

export const paymentService = {
  methods: (country: string, currency: string) => apiClient.get<ApiEnvelope<{ methods: PaymentMethod[]; recommended: PaymentGateway }>>("/payments/methods", query({ country, currency })).then(r => r.data),
  create: (payload: { bookingRequestReference: string; gateway: PaymentGateway; billingCountry: string }, key: string) => apiClient.post<ApiEnvelope<PaymentCreateData>>("/payments/create", payload, idem(key)).then(r => r.data),
  status: (reference: string) => apiClient.get<ApiEnvelope<{ payment: Payment }>>(`/payments/${reference}`).then(r => r.data),
};

export const adminService = {
  dashboard: () => apiClient.get<ApiEnvelope<DashboardData>>("/admin/dashboard").then(r => r.data),
  requests: (params: ListParams) => apiClient.get<ApiEnvelope<{ requests: BookingRequestSummary[] }>>("/admin/booking-requests", query(params)).then(r => r.data),
  request: (reference: string) => apiClient.get<ApiEnvelope<{ bookingRequest: BookingRequestDetail }>>(`/admin/booking-requests/${reference}`).then(r => r.data),
  updateRequestStatus: (reference: string, payload: { status: string; note?: string }) => apiClient.patch<ApiEnvelope<{ bookingRequest: BookingRequestDetail }>>(`/admin/booking-requests/${reference}/status`, payload).then(r => r.data),
  quote: (reference: string, payload: { amount: number; currency: string; breakdown: { baseFare: number; apiFee: number; gatewayFee: number; margin: number }; expiresInHours: number; message?: string; skipApproval?: boolean }) => apiClient.post<ApiEnvelope<{ bookingRequest: BookingRequestDetail }>>(`/admin/booking-requests/${reference}/quote`, payload).then(r => r.data),
  requestMessages: (reference: string, params: ListParams) => apiClient.get<ApiEnvelope<{ messages: Message[] }>>(`/admin/booking-requests/${reference}/messages`, query(params)).then(r => r.data),
  replyRequest: (reference: string, body: string) => apiClient.post<ApiEnvelope<{ message: Message }>>(`/admin/booking-requests/${reference}/messages`, { body }).then(r => r.data),
  unreadMessages: () => apiClient.get<ApiEnvelope<{ unread: number }>>("/admin/messages/unread").then(r => r.data),
  bookRequest: (reference: string, payload: Record<string, unknown>, key: string) => apiClient.post<ApiEnvelope<{ booking: Booking }>>(`/admin/booking-requests/${reference}/book`, payload, idem(key)).then(r => r.data),
  bookViaDuffel: (reference: string, payload: { offerId?: string; acceptNewPrice?: boolean; paymentReceived?: { gateway: PaymentGateway; method: string; referenceNote: string } }, key: string) => apiClient.post<ApiEnvelope<{ booking: Booking & { duffelOrderId?: string; liveMode?: boolean } }>>(`/admin/booking-requests/${reference}/book-duffel`, payload, idem(key)).then(r => r.data),
  bookings: (params: ListParams) => apiClient.get<ApiEnvelope<{ bookings: Booking[] }>>("/admin/bookings", query(params)).then(r => r.data),
  booking: (reference: string) => apiClient.get<ApiEnvelope<{ booking: Booking }>>(`/admin/bookings/${reference}`).then(r => r.data),
  updateBooking: (reference: string, payload: Partial<Booking>) => apiClient.patch<ApiEnvelope<{ booking: Booking }>>(`/admin/bookings/${reference}`, payload).then(r => r.data),
  cancelBooking: (reference: string, payload: { reason: string; triggerRefund: boolean }) => apiClient.patch<ApiEnvelope<{ booking: Booking }>>(`/admin/bookings/${reference}/cancel`, payload).then(r => r.data),
  uploadDocument: (reference: string, file: File) => { const body = new FormData(); body.append("document", file); return apiClient.post<ApiEnvelope<{ booking: Booking }>>(`/admin/bookings/${reference}/documents`, body, { headers: { "Content-Type": "multipart/form-data" } }).then(r => r.data); },
  customers: (params: ListParams) => apiClient.get<ApiEnvelope<{ customers: Customer[] }>>("/admin/customers", query(params)).then(r => r.data),
  customer: (id: string) => apiClient.get<ApiEnvelope<{ customer: Customer }>>(`/admin/customers/${id}`).then(r => r.data),
  enquiries: (params: ListParams) => apiClient.get<ApiEnvelope<{ enquiries: Enquiry[] }>>("/admin/enquiries", query(params)).then(r => r.data),
  updateEnquiry: (id: string, status: Enquiry["status"]) => apiClient.patch<ApiEnvelope<{ enquiry: Enquiry }>>(`/admin/enquiries/${id}`, { status }).then(r => r.data),
  replyEnquiry: (id: string, message: string) => apiClient.post<ApiEnvelope<{ enquiry: Enquiry }>>(`/admin/enquiries/${id}/reply`, { message }).then(r => r.data),
  refund: (paymentReference: string, payload: { amount: number; reason: string }) => apiClient.post<ApiEnvelope<{ refund: Record<string, unknown> }>>(`/admin/payments/${paymentReference}/refund`, payload).then(r => r.data),
  users: (params: ListParams) => apiClient.get<ApiEnvelope<{ users: User[] }>>("/admin/users", query(params)).then(r => r.data),
  createUser: (payload: { name: string; email: string; phone: string; password: string; role: "admin" | "super_admin"; country: string }) => apiClient.post<ApiEnvelope<{ user: User }>>("/admin/users", payload).then(r => r.data),
  updateUser: (id: string, payload: Partial<Pick<User, "role" | "isEmailVerified">> & { isActive?: boolean }) => apiClient.patch<ApiEnvelope<{ user: User }>>(`/admin/users/${id}`, payload).then(r => r.data),
  exportCsv: async (kind: "bookings" | "requests" | "payments", params: Record<string, unknown> = {}) => apiClient.get(`/admin/exports/${kind}`, { params: { format: "csv", ...params }, responseType: "blob" }),
};
