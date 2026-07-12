import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { AdminLayout } from "@/components/AdminLayout";
import { FullPageLoader } from "@/components/ui";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ToastViewport } from "@/components/ToastViewport";
import { HomePage } from "@/pages/HomePage";
import { SearchPage } from "@/pages/SearchPage";
import { AuthPage } from "@/pages/AuthPage";
import { BookingCreatePage } from "@/pages/BookingCreatePage";
import { TrackBookingPage } from "@/pages/TrackBookingPage";
import { ContactPage } from "@/pages/ContactPage";
import { CustomerBookingsPage } from "@/pages/CustomerBookingsPage";
import { BookingDetailPage } from "@/pages/BookingDetailPage";
import { TicketPage } from "@/pages/TicketPage";
import { PaymentStatusPage } from "@/pages/PaymentStatusPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { useAuthBootstrap } from "@/query/hooks";
import { useAuthStore } from "@/store/auth";

const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminRequestsPage = lazy(() => import("@/pages/admin/AdminRequestsPage"));
const AdminRequestDetailPage = lazy(() => import("@/pages/admin/AdminRequestDetailPage"));
const AdminBookingsPage = lazy(() => import("@/pages/admin/AdminBookingsPage"));
const AdminManualBookingPage = lazy(() => import("@/pages/admin/AdminManualBookingPage"));
const AdminCustomersPage = lazy(() => import("@/pages/admin/AdminCustomersPage"));
const AdminEnquiriesPage = lazy(() => import("@/pages/admin/AdminEnquiriesPage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));

export function App() {
  const bootstrap = useAuthBootstrap();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    const onExpired = () => window.location.assign("/login?expired=1");
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  if (!hasHydrated || (Boolean(accessToken) && bootstrap.isPending)) return <FullPageLoader label="Restoring secure session" />;

  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="login" element={<AuthPage mode="login" />} />
          <Route path="register" element={<AuthPage mode="register" />} />
          <Route path="forgot-password" element={<AuthPage mode="forgot" />} />
          <Route path="reset-password" element={<AuthPage mode="reset" />} />
          <Route path="verify-email" element={<AuthPage mode="verify" />} />
          <Route path="track/:reference?" element={<TrackBookingPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="payment/:reference" element={<PaymentStatusPage />} />
          <Route element={<ProtectedRoute roles={["customer"]} />}>
            {/* Booking requires login: guests are redirected to /login?returnTo=/booking/new */}
            <Route path="booking/new" element={<BookingCreatePage />} />
            <Route path="account/bookings" element={<CustomerBookingsPage />} />
            <Route path="account/bookings/:reference" element={<BookingDetailPage />} />
            <Route path="account/bookings/:reference/ticket" element={<TicketPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={["admin", "super_admin"]} />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Suspense fallback={<FullPageLoader />}><AdminDashboardPage /></Suspense>} />
            <Route path="requests" element={<Suspense fallback={<FullPageLoader />}><AdminRequestsPage /></Suspense>} />
            <Route path="requests/:reference" element={<Suspense fallback={<FullPageLoader />}><AdminRequestDetailPage /></Suspense>} />
            <Route path="bookings" element={<Suspense fallback={<FullPageLoader />}><AdminBookingsPage /></Suspense>} />
            <Route path="manual-booking" element={<Suspense fallback={<FullPageLoader />}><AdminManualBookingPage /></Suspense>} />
            <Route path="customers" element={<Suspense fallback={<FullPageLoader />}><AdminCustomersPage /></Suspense>} />
            <Route path="enquiries" element={<Suspense fallback={<FullPageLoader />}><AdminEnquiriesPage /></Suspense>} />
            <Route path="users" element={<Suspense fallback={<FullPageLoader />}><AdminUsersPage /></Suspense>} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <ToastViewport />
    </>
  );
}
