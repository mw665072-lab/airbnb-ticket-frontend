import { ArrowLeft, Plane } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ETicketActions } from "@/components/ETicketActions";
import { ErrorState, InlineLoader } from "@/components/ui";
import { useETicket } from "@/query/hooks";
import type { ETicketSegment } from "@/types/api";

function dt(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date);
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-0.5 text-sm font-bold text-slate-900">{value}</dd>{hint && <span className="text-[10px] text-slate-400">{hint}</span>}</div>;
}

function SegmentBlock({ segment }: { segment: ETicketSegment }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-3 font-display text-2xl font-extrabold text-slate-900"><span>{segment.origin}</span><Plane className="h-5 w-5 text-blue-800" /><span>{segment.destination}</span></div>
      <div className="text-right"><strong className="block text-sm text-blue-800">Flight {segment.flightNumber || "—"}</strong>{segment.operatingCarrier && <span className="text-xs text-slate-400">Operated by {segment.operatingCarrier}</span>}</div>
    </div>
    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
      <Field label="Departure" value={dt(segment.departure)} />
      <Field label="Arrival" value={dt(segment.arrival)} />
      <Field label="Boarding" value={dt(segment.boardingTimeEst)} hint="Est." />
      <Field label="Gate" value="At check-in" />
      <Field label="Seat" value={segment.seat || "At check-in"} />
    </dl>
  </div>;
}

export function TicketPage() {
  const { reference = "" } = useParams();
  const eTicket = useETicket(reference);
  const ticket = eTicket.data?.data.booking;

  return <main className="page-shell py-10">
    <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
      <Link to={`/account/bookings/${reference}`} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="h-4 w-4" />Back to booking</Link>
      {ticket && <ETicketActions reference={reference} booking={ticket} onPrint={() => window.print()} />}
    </div>

    {eTicket.isPending ? <InlineLoader label="Loading your e-ticket" />
      : eTicket.isError ? <ErrorState error={eTicket.error} onRetry={() => eTicket.refetch()} />
      : ticket ? <div className="print-ticket mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between bg-[#102e62] px-8 py-6 text-white">
          <div className="flex items-center gap-3">
            {ticket.airlineLogoUrl ? <img src={ticket.airlineLogoUrl} alt="" className="h-10 w-10 rounded-lg bg-white object-contain p-1" /> : <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/10"><Plane className="h-5 w-5" /></span>}
            <div><strong className="block font-display text-xl font-extrabold">{ticket.airline}</strong><span className="text-xs text-blue-100/70">Electronic Ticket</span></div>
          </div>
          <div className="flex flex-col items-end gap-1"><span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-200">{ticket.status}</span>{ticket.bookedByAdmin && <span className="rounded-full bg-amber-400/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200">Booked by Admin</span>}</div>
        </div>

        <div className="grid gap-6 p-8 sm:grid-cols-[1fr_auto]">
          <div className="space-y-6">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Booking ID" value={ticket.reference} />
              <Field label="PNR" value={ticket.pnr} />
              <Field label="Ticket no." value={ticket.eTicketNumbers[0] || "—"} />
            </dl>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Passengers</p>
              <ul className="mt-2 space-y-1">{ticket.passengers.map((p, i) => <li key={i} className="text-sm font-bold text-slate-900">{[p.title, p.firstName, p.lastName].filter(Boolean).join(" ")} <span className="text-xs font-semibold text-slate-400">({p.type})</span></li>)}</ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-start">
            <img src={ticket.qrDataUrl} alt="Ticket QR code" className="h-36 w-36 rounded-xl border border-slate-200" />
            <span className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Scan to verify</span>
          </div>
        </div>

        <div className="space-y-4 px-8 pb-8">{ticket.segments.map((segment, i) => <SegmentBlock key={i} segment={segment} />)}</div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-8 py-5">
          <div><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total paid</span><strong className="block font-display text-xl text-slate-900">{ticket.currency} {Number(ticket.amount).toFixed(2)}</strong></div>
          <div className="text-right"><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Payment</span><strong className="block text-sm uppercase text-emerald-700">{ticket.paymentStatus}</strong></div>
        </div>
        <p className="border-t border-slate-100 px-8 py-4 text-center text-[11px] leading-5 text-slate-400">Gate, seat and boarding time are confirmed by the airline at the airport. Arrive at least 2 hours before departure with a valid photo ID / passport.</p>
      </div> : null}
  </main>;
}
