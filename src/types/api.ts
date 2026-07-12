export type UserRole = "customer" | "admin" | "super_admin";
export type BookingRequestStatus = "submitted" | "in_review" | "quoted" | "awaiting_payment" | "confirmed" | "ticketed" | "cancelled" | "rejected";
export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "refunded" | "partially_refunded" | "disputed";
export type PaymentGateway = "stripe" | "paypal" | "regional";
export type TripType = "one_way" | "round_trip" | "multi_city";
export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export interface ApiMeta { page: number; limit: number; total: number; totalPages: number; }
export interface ApiEnvelope<T> { success: boolean; message?: string; data: T; meta?: ApiMeta; }
export interface ApiFieldError { field?: string; message: string; }
export interface User { id: string; name: string; email: string; phone?: string; role: UserRole; country?: string; isEmailVerified?: boolean; createdAt?: string; }
export interface AuthData { user: User; accessToken: string; }
export interface Airport { iata: string; name: string; city: string; country: string; }
export interface RoutePlace { iata: string; city: string; country?: string; }
export interface PopularRoute { id: string; origin: RoutePlace; destination: RoutePlace; startingPrice: number; currency: string; departureDate: string; airline?: FlightOffer["airline"]; offerCount?: number; }
export interface FlightSlice { origin: RoutePlace; destination: RoutePlace; departure: string; arrival: string; durationMinutes: number; stops: number; flightNumber: string; }
export interface AvailableService { id: string; type: string; totalAmount?: number | null; currency?: string | null; passengerIds?: string[]; segmentIds?: string[]; metadata?: Record<string, unknown> | null; }
export interface FlightOffer { offerId: string; airline: { code: string; name: string; logoUrl?: string }; totalAmount: number; currency: string; cabinClass: CabinClass; slices: FlightSlice[]; baggage?: { checkedBags?: number; cabinBags?: number; checkedKg?: number; cabinKg?: number }; refundable?: boolean; conditions?: Record<string, unknown> | null; availableServices?: AvailableService[]; expiresAt?: string; paymentRequirements?: { requiresInstantPayment: boolean; priceGuaranteeExpiresAt?: string | null }; source?: "duffel"; }
export interface SearchFlightsPayload { tripType: TripType; segments: Array<{ origin: string; destination: string; departureDate: string }>; returnDate?: string; cabinClass: CabinClass; passengers: { adults: number; children: number; infants: number; childrenAges?: number[] }; }
export interface FlightSearchData { searchId: string; clientKey?: string | null; currency: string; offers: FlightOffer[]; source?: "duffel"; }
export interface PassengerPayload { type: "adult" | "child" | "infant"; title: "mr" | "mrs" | "ms" | "miss"; firstName: string; lastName: string; gender: "m" | "f"; dob: string; email: string; phone: string; nationality: string; passportNumber: string; passportExpiry: string; passportIssuingCountry: string; responsibleAdultIndex?: number | null; }
export interface CreateBookingRequestPayload { offerId: string; selectedServices?: Array<{ id: string }>; contact: { name: string; email: string; phone: string }; trip: { type: TripType; segments: SearchFlightsPayload["segments"]; returnDate?: string; cabinClass: CabinClass; passengers: SearchFlightsPayload["passengers"] }; passengers: PassengerPayload[]; notes?: string; }
export interface Quote { amount: number; currency: string; breakdown?: { baseFare: number; apiFee: number; gatewayFee: number; margin: number }; expiresAt?: string; }
export interface BookingRequestSummary { id: string; reference: string; route?: string; departureDate?: string; contact?: { name: string; email: string; phone?: string }; contactName?: string; paxCount?: number; status: BookingRequestStatus; cancellationRequestedAt?: string | null; quote?: Quote; unreadMessages?: number; createdAt: string; assignedAdmin?: User | null; }
export interface BookingRequestDetail extends BookingRequestSummary { trip?: CreateBookingRequestPayload["trip"]; passengers?: PassengerPayload[]; notes?: string; offerId?: string | null; statusHistory?: Array<{ status: BookingRequestStatus; note?: string; at: string }>; changeRequested?: boolean; cancellationRequestedAt?: string | null; messages?: Message[]; payment?: Payment; linkedPayment?: Payment | null; linkedBooking?: Booking | null; }
export interface Message { id: string; sender: "customer" | "admin"; body: string; createdAt: string; attachments?: Array<{ name: string; url: string }>; }
export interface PaymentMethod { gateway: PaymentGateway; label: string; type: "elements" | "redirect"; available: boolean; }
export interface Payment { reference: string; gateway: PaymentGateway; amount: number; currency: string; status: PaymentStatus; method?: string; paidAt?: string; bookingRequest?: { reference: string; status: BookingRequestStatus }; }
export interface PaymentCreateData { payment: Payment; next: { type: "stripe_elements" | "redirect"; clientSecret?: string; publishableKey?: string; checkoutUrl?: string }; }
export interface DuffelCancellation { id?: string; status?: "quoted" | "confirmed" | "failed"; refundAmount?: number | null; refundCurrency?: string | null; expiresAt?: string | null; confirmedAt?: string | null; reason?: string; }
export interface ScheduleChange { id?: string; _id?: string; eventId?: string; type?: string; status: "pending" | "accepted" | "rejected" | "noted"; message?: string; createdAt?: string; resolvedAt?: string | null; }
export interface Booking { id?: string; reference: string; pnr?: string; duffelOrderId?: string; airline?: string; eTicketNumbers?: string[]; amount?: number; currency?: string; status: "confirmed" | "ticketed" | "cancelled" | "refunded"; contact?: { name: string; email: string; phone?: string }; route?: string; segments?: Array<Record<string, unknown>>; documents?: Array<{ name: string; url: string }>; payment?: Payment; fareConditions?: Record<string, unknown> | null; availableServices?: AvailableService[]; seatMaps?: unknown[]; duffelCancellation?: DuffelCancellation | null; scheduleChanges?: ScheduleChange[]; createdAt?: string; }
export interface ETicketSegment { origin: string; destination: string; flightNumber?: string; departure: string; arrival: string; operatingCarrier?: string | null; seat?: string | null; cabinClass?: string | null; boardingTimeEst?: string | null; }
export interface ManualBookingPayload {
  contact: { name: string; email: string; phone: string };
  passengers: PassengerPayload[];
  flight: { airline: string; cabinClass: CabinClass; segments: Array<{ origin: string; destination: string; flightNumber: string; departure: string; arrival: string; seat?: string }> };
  payment: { gateway: PaymentGateway; method: string; status: PaymentStatus; amount: number; currency: string; referenceNote?: string };
  offerId?: string;
  notes?: string;
  pnr?: string;
  eTicketNumbers?: string[];
}
export interface BookingRefund { amount: number; reason?: string | null; at: string; }
export interface BookingCancellation { status?: string | null; refundAmount?: number | null; refundCurrency?: string | null; confirmedAt?: string | null; }
export interface CustomerBooking { reference: string; requestReference?: string; pnr: string; airline: string; airlineLogoUrl?: string | null; eTicketNumbers: string[]; status: string; bookedByAdmin?: boolean; amount: number; currency: string; paymentStatus: string; cancellation?: BookingCancellation | null; refunds?: BookingRefund[]; segments: ETicketSegment[]; passengers: Array<{ title?: string; firstName: string; lastName: string; type: string }>; documents?: Array<{ name: string; url: string }>; createdAt?: string; qrDataUrl: string; }
export interface CustomerRefund { paymentReference: string; amount: number; currency: string; reason?: string | null; at: string; }
export interface CustomerCancelledTicket { reference: string; pnr?: string; airline?: string; status: string; refundAmount?: number | null; refundCurrency?: string; createdAt?: string; }
export interface Customer { id: string; name: string; email: string; phone?: string; country?: string; blocked?: boolean; blockedAt?: string | null; stats?: { requests: number; bookings: number; totalSpent: number }; lastActivityAt?: string; createdAt?: string; timeline?: Array<{ type?: string; message?: string; createdAt?: string; [key: string]: unknown }>; requests?: BookingRequestSummary[]; bookings?: Booking[]; refunds?: CustomerRefund[]; cancelledTickets?: CustomerCancelledTicket[]; }
export interface Enquiry { id: string; name: string; email: string; phone?: string; subject: string; message: string; source?: "landing" | "portal"; status: "new" | "read" | "replied" | "closed"; createdAt: string; reply?: { message: string; at: string } | null; }
export interface DashboardData { today: { newRequests: number; confirmedBookings: number; revenue: number; currency: string }; counters: { pendingRequests: number; awaitingPayment: number; openEnquiries: number; disputes: number }; overview: { totalFlights: number; totalBookings: number; todaysBookings: number; totalRevenue: number; currency: string; pendingRefunds: number; completedRefunds: number; activeUsers: number; cancelledTickets: number }; charts: { monthlyRevenue: Array<{ month: string; revenue: number }>; bookingStats: Array<{ status: string; count: number }>; flightPopularity: Array<{ route: string; count: number }>; refundAnalytics: Array<{ month: string; count: number; amount: number }> }; last30Days: { requests: number; bookings: number; conversionRate: number; revenue: number; profit: number }; chart: Array<{ date: string; requests: number; bookings: number; revenue: number }>; recentRequests: BookingRequestSummary[]; }
export interface ListParams { page?: number; limit?: number; sort?: string; search?: string; status?: string; dateFrom?: string; dateTo?: string; assigned?: string; }
