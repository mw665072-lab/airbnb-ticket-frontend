import { ArrowRight, BadgeCheck, Globe2, Headphones, LockKeyhole, PlaneTakeoff, Route, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { FlightSearchForm } from "@/components/FlightSearchForm";
import { ErrorState, InlineLoader } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { usePopularRoutes } from "@/query/hooks";
import type { PopularRoute, SearchFlightsPayload } from "@/types/api";

export function HomePage() {
  const navigate = useNavigate();
  const routes = usePopularRoutes();
  const search = (payload: SearchFlightsPayload) => navigate("/search", { state: { payload } });
  const openRoute = (route: PopularRoute) => search({
    tripType: "one_way",
    segments: [{ origin: route.origin.iata, destination: route.destination.iata, departureDate: route.departureDate }],
    cabinClass: "economy",
    passengers: { adults: 1, children: 0, infants: 0 },
  });

  return <main>
    <section className="hero-grid relative overflow-hidden bg-[#102e62] pb-24 pt-16 text-white sm:pt-22">
      <div className="absolute -right-20 top-10 h-96 w-96 rounded-full border border-white/10"><div className="hero-orbit absolute inset-12 rounded-full border border-dashed border-white/20"><PlaneTakeoff className="absolute -top-3 left-1/2 h-6 w-6 -translate-x-1/2 text-blue-200" /></div></div>
      <div className="page-shell relative"><div className="max-w-4xl"><motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-blue-100"><Sparkles className="h-4 w-4" />Personal travel desk, powered by live APIs</motion.div><motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }} className="mt-6 max-w-4xl font-display text-5xl font-extrabold leading-[1.02] tracking-[-.055em] sm:text-6xl lg:text-7xl">A clearer way to search, request, and confirm your next flight.</motion.h1><p className="mt-6 max-w-2xl text-base leading-7 text-blue-100/80 sm:text-lg">Compare live airline offers, send verified passenger details, receive a transparent quote, and complete payment securely.</p></div><div className="mt-10"><FlightSearchForm onSearch={search} /></div><div className="mt-7 flex flex-wrap gap-x-7 gap-y-3 text-xs font-bold text-blue-100/75"><span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-emerald-300" />Human-reviewed quotes</span><span className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-emerald-300" />Secure checkout handoff</span><span className="flex items-center gap-2"><Headphones className="h-4 w-4 text-emerald-300" />Request-level messaging</span></div></div>
    </section>

    <section className="page-shell relative z-10 -mt-10"><div className="grid gap-4 md:grid-cols-3">{[
      { icon: Globe2, title: "Global search", text: "Search live airline inventory across countries, cities, and airports." },
      { icon: Route, title: "One tracked workflow", text: "Every request has a reference, status timeline, quote, messages, and payment state." },
      { icon: Headphones, title: "Travel desk support", text: "Ask for alternatives or changes without losing context in disconnected email threads." },
    ].map(({ icon: Icon, title, text }) => <div key={title} className="surface p-6"><Icon className="h-6 w-6 text-blue-800" /><h2 className="mt-5 font-display text-xl font-extrabold text-slate-900">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>)}</div></section>

    <section className="page-shell py-24">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">Live popular routes</p><h2 className="section-title mt-3">Start with routes travellers request most.</h2><p className="mt-3 text-sm text-slate-500">Current one-way economy fares for travel in approximately 30 days.</p></div><Link to="/search" className="btn-secondary">Explore all flights<ArrowRight className="h-4 w-4" /></Link></div>
      <div className="mt-9">{routes.isPending
        ? <InlineLoader label="Loading live Duffel fares" />
        : routes.isError
          ? <ErrorState error={routes.error} onRetry={() => routes.refetch()} />
          : routes.data?.data.routes.length
            ? <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{routes.data.data.routes.map((route) => <button key={route.id} onClick={() => openRoute(route)} className="group rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="flex items-center justify-between"><div className="flex items-center gap-3">{route.airline?.logoUrl ? <img src={route.airline.logoUrl} alt="" className="h-11 w-11 rounded-xl border border-slate-100 object-contain p-2" /> : <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50"><PlaneTakeoff className="h-5 w-5 text-blue-800" /></span>}<div><p className="text-xs font-bold uppercase tracking-[.16em] text-blue-700">{route.origin.iata} → {route.destination.iata}</p><h3 className="mt-1 font-display text-xl font-extrabold text-slate-900">{route.origin.city} to {route.destination.city}</h3></div></div><span className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-800"><ArrowRight className="h-4 w-4" /></span></div><div className="mt-6 flex items-end justify-between border-t border-slate-100 pt-5"><div><span className="text-xs font-semibold text-slate-400">Live from</span><strong className="block font-display text-2xl text-slate-900">{formatMoney(route.startingPrice, route.currency)}</strong></div><div className="text-right text-xs text-slate-400"><strong className="block text-slate-600">{route.airline?.name}</strong>{route.offerCount} offers</div></div></button>)}</div>
            : <p className="surface-soft p-8 text-center text-sm text-slate-500">No live featured-route offers are currently available.</p>}
      </div>
    </section>

    <section className="page-shell pb-24"><div className="overflow-hidden rounded-[2.5rem] bg-[#13213b] p-8 text-white sm:p-12"><div className="grid gap-10 lg:grid-cols-[1fr_.8fr] lg:items-center"><div><p className="eyebrow !text-blue-300">Group and complex travel</p><h2 className="mt-3 font-display text-4xl font-extrabold tracking-[-.04em]">Need a multi-passenger or special itinerary?</h2><p className="mt-4 max-w-xl text-blue-100/70">Send the operations team your dates, passenger count, and preferred route.</p></div><div className="flex flex-wrap gap-3 lg:justify-end"><Link to="/contact" className="btn-primary !bg-white !text-blue-950">Contact travel desk</Link><Link to="/track" className="btn-secondary !border-white/15 !bg-white/10 !text-white">Track a request</Link></div></div></div></section>
  </main>;
}
