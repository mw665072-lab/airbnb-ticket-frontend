import { Menu, Plane, ShieldCheck, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { authService } from "@/api/services";
import { useAuthStore } from "@/store/auth";
import { useToastStore } from "@/store/toast";

const nav = [{ to: "/", label: "Discover" }, { to: "/track", label: "Track booking" }, { to: "/contact", label: "Travel support" }];
export function AppLayout() {
  const [open, setOpen] = useState(false); const user = useAuthStore((s) => s.user); const clear = useAuthStore((s) => s.clearSession); const push = useToastStore((s) => s.push); const navigate = useNavigate();
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;
  const logout = async () => { try { await authService.logout(); } finally { clear(); push("You have been signed out", "info"); navigate("/"); } };
  return <div className="min-h-screen bg-[#f7f8fb]">
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl"><div className="page-shell flex h-18 items-center justify-between"><Link to="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#173f85] text-white shadow-lg"><Plane className="h-5 w-5 -rotate-12" /></span><span><strong className="block font-display text-lg tracking-[-0.03em] text-slate-900">AeroVoyage</strong><span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Travel desk</span></span></Link>
      <nav className="hidden items-center gap-1 md:flex">{nav.map((item) => <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({isActive}) => `rounded-xl px-4 py-2 text-sm font-bold transition ${isActive ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>{item.label}</NavLink>)}</nav>
      <div className="hidden items-center gap-2 md:flex">{user ? <><Link className="btn-secondary min-h-10 px-4" to={user.role === "customer" ? "/account/bookings" : "/admin/dashboard"}><UserRound className="h-4 w-4" />{user.name.split(" ")[0]}</Link><button className="text-xs font-bold text-slate-500 hover:text-slate-900" onClick={logout}>Sign out</button></> : <><Link className="btn-secondary min-h-10 px-4" to="/login">Sign in</Link><Link className="btn-primary min-h-10 px-4" to="/register">Create account</Link></>}</div>
      <button className="md:hidden" aria-label="Toggle menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div>
      {open ? <div className="border-t border-slate-100 bg-white p-4 md:hidden"><div className="page-shell flex flex-col gap-2">{nav.map((item) => <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">{item.label}</Link>)}<Link to={user ? (user.role === "customer" ? "/account/bookings" : "/admin/dashboard") : "/login"} className="btn-primary mt-2" onClick={() => setOpen(false)}>{user ? "Open dashboard" : "Sign in"}</Link></div></div> : null}
    </header>
    <Outlet />
    <footer className="mt-20 border-t border-slate-200 bg-white"><div className="page-shell grid gap-10 py-12 md:grid-cols-[1.2fr_.8fr_.8fr]"><div><div className="flex items-center gap-2 font-display text-xl font-extrabold text-slate-900"><Plane className="h-5 w-5 text-blue-800" />AeroVoyage</div><p className="mt-3 max-w-md text-sm leading-6 text-slate-500">A modern booking desk for real flight searches, transparent quotes, secure checkout, and human travel support.</p><div className="mt-5 flex items-center gap-2 text-xs font-bold text-emerald-700"><ShieldCheck className="h-4 w-4" />Secure session and payment handoff</div></div><div><p className="eyebrow">Travel</p><div className="mt-4 flex flex-col gap-3 text-sm font-semibold text-slate-600"><Link to="/search">Search flights</Link><Link to="/track">Track request</Link><Link to="/contact">Contact team</Link></div></div><div><p className="eyebrow">Account</p><div className="mt-4 flex flex-col gap-3 text-sm font-semibold text-slate-600"><Link to="/login">Sign in</Link><Link to="/register">Register</Link>{supportEmail ? <a href={`mailto:${supportEmail}`}>{supportEmail}</a> : null}</div></div></div><div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400">© {new Date().getFullYear()} AeroVoyage. Flight availability and fares are confirmed before ticketing.</div></footer>
  </div>;
}
