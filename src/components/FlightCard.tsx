import { ArrowRight, BriefcaseBusiness, Clock3, Plane, ShieldCheck } from "lucide-react";
import { durationLabel, formatDate, formatMoney, humanize } from "@/lib/format";
import type { FlightOffer, FlightSlice } from "@/types/api";

function SliceRoute({ slice, label }: { slice: FlightSlice; label: string }) {
  return <div className="grid grid-cols-[92px_1fr_92px] items-center gap-3">
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">{label}</span>
      <strong className="mt-1 block font-display text-2xl text-slate-900">{slice.origin.iata}</strong>
      <p className="truncate text-xs text-slate-500">{slice.origin.city}</p>
      <p className="mt-1 text-[11px] font-semibold text-slate-400">{formatDate(slice.departure, true)}</p>
    </div>
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-slate-200" />
      <div className="min-w-28 text-center">
        <Plane className="mx-auto h-4 w-4 rotate-45 text-blue-700" />
        <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-slate-400">
          {durationLabel(slice.durationMinutes)} · {slice.stops ? `${slice.stops} ${slice.stops === 1 ? "stop" : "stops"}` : "Nonstop"}
        </span>
      </div>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
    <div className="text-right">
      <span className="text-[10px] font-bold uppercase tracking-wider text-transparent">{label}</span>
      <strong className="mt-1 block font-display text-2xl text-slate-900">{slice.destination.iata}</strong>
      <p className="truncate text-xs text-slate-500">{slice.destination.city}</p>
      <p className="mt-1 text-[11px] font-semibold text-slate-400">{formatDate(slice.arrival, true)}</p>
    </div>
  </div>;
}

export function FlightCard({ offer, onSelect }: { offer: FlightOffer; onSelect: () => void }) {
  const outbound = offer.slices[0];
  const inbound = offer.slices[1];
  return <article className="surface overflow-hidden p-5 transition hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(15,23,42,.11)] sm:p-6">
    <div className="grid gap-6 lg:grid-cols-[190px_1fr_155px] lg:items-center">
      <div className="flex items-center gap-3">
        {offer.airline.logoUrl
          ? <img src={offer.airline.logoUrl} alt="" className="h-12 w-12 rounded-2xl border border-slate-100 object-contain p-2" />
          : <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-800"><Plane className="h-5 w-5" /></span>}
        <div><strong className="block font-display text-base text-slate-900">{offer.airline.name}</strong><span className="text-xs font-semibold text-slate-500">{outbound?.flightNumber}</span></div>
      </div>
      <div className="space-y-5">{offer.slices.map((slice, index) => {
        const label = offer.slices.length === 2 ? (index === 0 ? "Outbound" : "Return") : `Flight ${index + 1}`;
        return <div key={`${slice.origin.iata}-${slice.destination.iata}-${slice.departure}`} className={index ? "border-t border-slate-100 pt-5" : ""}><SliceRoute slice={slice} label={label} /></div>;
      })}</div>
      <div className="grid gap-3 lg:text-right"><div><span className="text-xs font-semibold text-slate-400">Total {inbound ? "round-trip" : "fare"}</span><strong className="block font-display text-2xl text-slate-900">{formatMoney(offer.totalAmount, offer.currency)}</strong></div><button className="btn-primary" onClick={onSelect}>Choose flight<ArrowRight className="h-4 w-4" /></button></div>
    </div>
    <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4 text-[11px] font-bold text-slate-500">
      <span className="rounded-full bg-slate-50 px-3 py-1.5">{humanize(offer.cabinClass)}</span>
      <span className="flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5"><BriefcaseBusiness className="h-3 w-3" />{offer.baggage?.checkedBags ?? 0} checked {offer.baggage?.checkedBags === 1 ? "bag" : "bags"}</span>
      <span className="flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5"><ShieldCheck className="h-3 w-3" />{offer.refundable ? "Refundable" : "Fare rules apply"}</span>
      {offer.expiresAt && <span className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-amber-700"><Clock3 className="h-3 w-3" />Offer expires {formatDate(offer.expiresAt, true)}</span>}
    </div>
  </article>;
}
