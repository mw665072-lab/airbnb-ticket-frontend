import { BarChart3, BookOpenCheck, ChevronRight, CircleUserRound, Inbox, LogOut, Menu, Plane, TicketCheck, Users, UserRoundCog, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { authService } from "@/api/services";
import { useAdminUnread } from "@/query/hooks";
import { useAuthStore } from "@/store/auth";
import { initials } from "@/lib/format";

const baseNav = [
  { to: "/admin/dashboard", label: "Overview", icon: BarChart3 },
  { to: "/admin/requests", label: "Booking requests", icon: BookOpenCheck },
  { to: "/admin/bookings", label: "Bookings", icon: TicketCheck },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/enquiries", label: "Enquiries", icon: Inbox },
];
export function AdminLayout() {
  const [open, setOpen] = useState(false); const user = useAuthStore(s => s.user)!; const clear = useAuthStore(s => s.clearSession); const navigate = useNavigate(); const location = useLocation(); const unread = useAdminUnread();
  const nav = user.role === "super_admin" ? [...baseNav, { to: "/admin/users", label: "Admin users", icon: UserRoundCog }] : baseNav;
  const signOut = async () => { try { await authService.logout(); } finally { clear(); navigate("/login"); } };
  const current = nav.find(item => location.pathname.startsWith(item.to));
  const sidebar = <><div className="flex h-18 items-center gap-3 border-b border-white/10 px-5"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-blue-900"><Plane className="h-5 w-5 -rotate-12" /></span><div><strong className="block font-display text-lg text-white">AeroVoyage</strong><span className="text-[9px] font-bold uppercase tracking-[.2em] text-blue-200">Operations</span></div></div><nav className="flex-1 space-y-1 p-3">{nav.map(({to,label,icon:Icon}) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({isActive}) => `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${isActive ? "bg-white text-blue-950 shadow-lg" : "text-blue-100 hover:bg-white/10 hover:text-white"}`}><Icon className="h-4 w-4"/><span className="flex-1">{label}</span>{label === "Enquiries" && (unread.data?.data.unread || 0) > 0 ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] text-white">{unread.data?.data.unread}</span> : null}<ChevronRight className="h-3.5 w-3.5 opacity-50" /></NavLink>)}</nav><div className="border-t border-white/10 p-4"><div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-xs font-extrabold text-white">{initials(user.name)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{user.name}</p><p className="truncate text-[11px] text-blue-200">{user.email}</p></div><button aria-label="Sign out" onClick={signOut}><LogOut className="h-4 w-4 text-blue-200" /></button></div></div></>;
  return <div className="min-h-screen bg-[#f4f6fa]"><aside className="fixed inset-y-0 left-0 z-50 hidden w-72 flex-col bg-[#102e62] lg:flex">{sidebar}</aside>{open ? <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close menu" className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} /><aside className="relative flex h-full w-72 flex-col bg-[#102e62]">{sidebar}</aside></div> : null}<div className="lg:pl-72"><header className="sticky top-0 z-40 flex h-18 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-xl sm:px-7"><div className="flex items-center gap-3"><button className="lg:hidden" onClick={() => setOpen(true)}>{open ? <X /> : <Menu />}</button><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">Operations console</p><h1 className="font-display text-xl font-extrabold text-slate-900">{current?.label || "Administration"}</h1></div></div><div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2"><CircleUserRound className="h-4 w-4 text-blue-800" /><span className="hidden text-xs font-bold text-slate-600 sm:inline">{user.role.replace("_", " ")}</span></div></header><main className="p-4 sm:p-7"><Outlet /></main></div></div>;
}
