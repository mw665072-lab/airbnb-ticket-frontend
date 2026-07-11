import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import type { UserRole } from "@/types/api";
export function ProtectedRoute({ roles }: { roles: UserRole[] }) { const user = useAuthStore((s) => s.user); const location = useLocation(); if (!user) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />; if (!roles.includes(user.role)) return <Navigate to={user.role === "customer" ? "/account/bookings" : "/admin/dashboard"} replace />; return <Outlet />; }
