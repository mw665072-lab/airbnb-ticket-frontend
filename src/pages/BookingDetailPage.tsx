import { lazy, Suspense, useState, type ReactNode } from "react";
import { ArrowLeft, Banknote, Clock, CreditCard, FileText, LoaderCircle, MapPin, MessageSquareText, Plane, RotateCcw, Send, Ticket, User, Users, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getErrorMessage } from "@/api/client";
import { bookingService, paymentService } from "@/api/services";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorState, InlineLoader } from "@/components/ui";
import { createIdempotencyKey } from "@/lib/idempotency";
import { formatDate, formatMoney } from "@/lib/format";
import { useBookingRequest, useETicket, useInvalidateRequest, useMessages, usePaymentMethods } from "@/query/hooks";
import { ETicketActions } from "@/components/ETicketActions";
import { useToastStore } from "@/store/toast";
import type { Booking, PaymentCreateData, PaymentGateway } from "@/types/api";

const StripePaymentPanel = lazy(() => import("@/components/StripePaymentPanel"));

export function BookingDetailPage() {
  const { reference = "" } = useParams();
  const request = useBookingRequest(reference);
  const messages = useMessages(reference);
  const invalidate = useInvalidateRequest(reference);
  const push = useToastStore((state) => state.push);
  const [message, setMessage] = useState("");
  const [change, setChange] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [billingCountry, setBillingCountry] = useState("PK");
  const [paymentFlow, setPaymentFlow] = useState<PaymentCreateData | null>(null);
  const [issuedBooking, setIssuedBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState("");
  const detail = request.data?.data.bookingRequest;
  const methods = usePaymentMethods(billingCountry, detail?.quote?.currency || "USD", detail?.status === "awaiting_payment");
  const eTicket = useETicket(reference, ["ticketed", "cancelled", "confirmed"].includes(detail?.status ?? ""));
  const ticket = eTicket.data?.data.booking;

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    try { await action(); await invalidate(); push("Request updated"); }
    catch (error) { push(getErrorMessage(error), "error"); }
    finally { setBusy(""); }
  };
  const send = () => run("message", () => bookingService.sendMessage(reference, message).then(() => setMessage("")));
  const createPayment = async (gateway: PaymentGateway) => {
    setBusy(`pay-${gateway}`);
    try {
      const result = await paymentService.create({ bookingRequestReference: reference, gateway, billingCountry }, createIdempotencyKey());
      setPaymentFlow(result.data);
      if (result.data.next.checkoutUrl) window.location.assign(result.data.next.checkoutUrl);
    } catch (error) { push(getErrorMessage(error), "error"); }
    finally { setBusy(""); }
  };
  const confirmManualPayment = async () => {
    setBusy("manual-payment");
    try {
      const result = await paymentService.manualConfirm(reference, createIdempotencyKey());
      if (result.data.booking) {
        setIssuedBooking(result.data.booking);
        push("Manual payment confirmed and Duffel ticket issued");
      } else {
        push(result.message || "Payment confirmed; ticketing requires admin review", "info");
      }
      await invalidate();
    } catch (error) { push(getErrorMessage(error), "error"); }
    finally { setBusy(""); }
  };

  return <main className="page-shell py-10">
    <Link to="/account/bookings" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="h-4 w-4" />All requests</Link>
    {request.isPending ? <InlineLoader /> : request.isError ? <div className="mt-7"><ErrorState error={request.error} onRetry={() => request.refetch()} /></div> : detail ? <div className="mt-6 grid gap-7 xl:grid-cols-[1fr_390px]">
      <section className="space-y-6">
        <div className="surface p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-2"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{detail.reference}</p>{ticket?.bookedByAdmin && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">Booked by Admin</span>}</div><h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900">{detail.route || `${detail.trip?.segments[0]?.origin || ""} → ${detail.trip?.segments.at(-1)?.destination || ""}`}</h1></div><StatusBadge status={detail.status} /></div><div className="mt-7 grid gap-4 sm:grid-cols-3"><Info label="Departure" value={formatDate(detail.departureDate || detail.trip?.segments[0]?.departureDate)} /><Info label="Passengers" value={String(detail.passengers?.length || detail.paxCount || 0)} /><Info label="Created" value={formatDate(detail.createdAt, true)} /></div></div>
        <div className="surface p-6 sm:p-8">
          <SectionHeading icon={<Plane className="h-5 w-5 text-blue-800" />} title="Itinerary" />
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Info label="Trip type" value={prettyLabel(detail.trip?.type)} />
            <Info label="Cabin class" value={prettyLabel(detail.trip?.cabinClass)} />
            <Info label="Travellers" value={paxSummary(detail.trip?.passengers)} />
          </div>
          <ol className="mt-6 space-y-3">
            {(detail.trip?.segments ?? []).map((segment, index) => <li key={index} className="surface-soft flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-800 text-xs font-bold text-white">{index + 1}</span>
              <div className="flex items-center gap-2 font-display text-lg font-extrabold text-slate-900"><span>{segment.origin}</span><MapPin className="h-4 w-4 text-slate-300" /><span>{segment.destination}</span></div>
              <span className="ml-auto text-sm font-bold text-slate-500">{formatDate(segment.departureDate)}</span>
            </li>)}
            {detail.trip?.returnDate && <li className="surface-soft flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">↩</span>
              <div className="font-display text-lg font-extrabold text-slate-900">Return</div>
              <span className="ml-auto text-sm font-bold text-slate-500">{formatDate(detail.trip.returnDate)}</span>
            </li>}
          </ol>
        </div>

        <div className="surface p-6 sm:p-8">
          <SectionHeading icon={<Users className="h-5 w-5 text-blue-800" />} title={`Passengers (${detail.passengers?.length || 0})`} />
          <div className="mt-6 space-y-4">
            {(detail.passengers ?? []).map((passenger, index) => <div key={index} className="surface-soft p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-blue-800" /><strong className="font-display text-base text-slate-900">{prettyLabel(passenger.title)} {passenger.firstName} {passenger.lastName}</strong></div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-blue-800">{passenger.type}</span>
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailRow label="Gender" value={passenger.gender === "m" ? "Male" : passenger.gender === "f" ? "Female" : passenger.gender} />
                <DetailRow label="Date of birth" value={formatDate(passenger.dob)} />
                <DetailRow label="Nationality" value={passenger.nationality} />
                <DetailRow label="Email" value={passenger.email} />
                <DetailRow label="Phone" value={passenger.phone} />
                <DetailRow label="Passport no." value={passenger.passportNumber} />
                <DetailRow label="Passport expiry" value={formatDate(passenger.passportExpiry)} />
                <DetailRow label="Issuing country" value={passenger.passportIssuingCountry} />
              </dl>
            </div>)}
            {!detail.passengers?.length && <p className="text-sm text-slate-500">No passenger details on file.</p>}
          </div>
        </div>

        <div className="surface p-6 sm:p-8">
          <SectionHeading icon={<User className="h-5 w-5 text-blue-800" />} title="Contact" />
          <dl className="mt-6 grid gap-x-6 gap-y-3 sm:grid-cols-3">
            <DetailRow label="Name" value={detail.contact?.name} />
            <DetailRow label="Email" value={detail.contact?.email} />
            <DetailRow label="Phone" value={detail.contact?.phone} />
          </dl>
          {detail.notes && <div className="mt-6 border-t border-slate-100 pt-5"><div className="flex items-center gap-2 text-slate-500"><FileText className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-wide">Notes</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{detail.notes}</p></div>}
        </div>

        {(detail.statusHistory?.length || 0) > 0 && <div className="surface p-6 sm:p-8">
          <SectionHeading icon={<Clock className="h-5 w-5 text-blue-800" />} title="Status timeline" />
          <ol className="mt-6 space-y-4">
            {[...(detail.statusHistory ?? [])].reverse().map((entry, index) => <li key={index} className="flex gap-4">
              <div className="mt-1 flex flex-col items-center"><span className="h-2.5 w-2.5 rounded-full bg-blue-800" />{index < (detail.statusHistory!.length - 1) && <span className="mt-1 w-px flex-1 bg-slate-200" />}</div>
              <div className="pb-2"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={entry.status} /><span className="text-xs text-slate-400">{formatDate(entry.at, true)}</span></div>{entry.note && <p className="mt-1 text-sm text-slate-600">{entry.note}</p>}</div>
            </li>)}
          </ol>
        </div>}

        <div className="surface p-6 sm:p-8"><div className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-blue-800" /><h2 className="font-display text-xl font-extrabold text-slate-900">Conversation</h2></div><div className="mt-6 max-h-[430px] space-y-3 overflow-auto pr-1">{messages.isPending ? <InlineLoader /> : (messages.data?.data.messages || []).map((item) => <div key={item.id} className={`flex ${item.sender === "customer" ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 ${item.sender === "customer" ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-700"}`}><p className="text-sm leading-6">{item.body}</p><span className="mt-1 block text-[10px] opacity-60">{formatDate(item.createdAt, true)}</span></div></div>)}</div><div className="mt-5 flex gap-2"><textarea className="textarea min-h-12 flex-1" placeholder="Write a message" value={message} onChange={(event) => setMessage(event.target.value)} /><button className="btn-primary self-end" disabled={!message.trim() || busy === "message"} onClick={send}>{busy === "message" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></div></div>
      </section>
      <aside className="space-y-5">
        {ticket && <div className="surface border border-emerald-200 bg-emerald-50/40 p-6">
          <div className="flex items-center gap-2"><Ticket className="h-5 w-5 text-emerald-700" /><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">E-Ticket issued</p></div>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-slate-900">{ticket.pnr}</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Booking ID</dt><dd className="font-bold">{ticket.reference}</dd></div>
            {ticket.eTicketNumbers[0] && <div className="flex justify-between gap-3"><dt className="text-slate-500">Ticket no.</dt><dd className="break-all text-right font-mono text-xs font-bold">{ticket.eTicketNumbers[0]}</dd></div>}
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-bold uppercase text-emerald-700">{ticket.status}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Payment</dt><dd className="font-bold uppercase text-emerald-700">{ticket.paymentStatus}</dd></div>
          </dl>
          <div className="mt-5"><ETicketActions reference={reference} booking={ticket} showView /></div>
        </div>}
        {!ticket && !eTicket.isPending && detail.status === "confirmed" && <div className="surface border border-blue-200 bg-blue-50/40 p-6">
          <div className="flex items-center gap-2"><Ticket className="h-5 w-5 text-blue-800" /><p className="text-xs font-bold uppercase tracking-wider text-blue-800">E-ticket pending</p></div>
          <p className="mt-3 text-sm text-slate-600">Payment received. Your e-ticket — including the downloadable PDF and QR code — will appear here as soon as the ticket is issued.</p>
        </div>}
        <div className="surface p-6"><p className="eyebrow">Quote and payment</p>{detail.quote ? <><strong className="mt-4 block font-display text-3xl text-slate-900">{formatMoney(detail.quote.amount, detail.quote.currency)}</strong><p className="mt-1 text-xs text-slate-400">Expires {formatDate(detail.quote.expiresAt, true)}</p>{detail.quote.breakdown && <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">{Object.entries(detail.quote.breakdown).map(([key, value]) => <div className="flex justify-between" key={key}><span className="text-slate-500">{key.replace(/([A-Z])/g, " $1")}</span><strong>{formatMoney(value, detail.quote!.currency)}</strong></div>)}</div>}</> : <p className="mt-4 text-sm text-slate-500">The operations team has not issued a quote yet.</p>}
          {detail.status === "awaiting_payment" && <div className="mt-6"><label className="label">Billing country</label><input className="field uppercase" maxLength={2} value={billingCountry} onChange={(event) => setBillingCountry(event.target.value.toUpperCase())} /><div className="mt-4 space-y-2">{(methods.data?.data.methods || []).filter((method) => method.available).map((method) => <button key={method.gateway} className="btn-secondary w-full justify-between" onClick={() => createPayment(method.gateway)} disabled={busy.startsWith("pay-")}><span className="flex items-center gap-2"><CreditCard className="h-4 w-4" />{method.label}</span>{busy === `pay-${method.gateway}` ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <span>→</span>}</button>)}{methods.data?.data.manualPaymentAvailable && <button className="btn-primary w-full justify-between" onClick={confirmManualPayment} disabled={Boolean(busy)}><span className="flex items-center gap-2"><Banknote className="h-4 w-4" />Manual payment (demo)</span>{busy === "manual-payment" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <span>→</span>}</button>}</div>{methods.data?.data.manualPaymentAvailable && <p className="mt-3 text-xs leading-5 text-amber-700">Demo mode only: no card is charged. Clicking confirms payment and immediately issues the Duffel test ticket.</p>}</div>}
        </div>
        {issuedBooking && <div className="surface border border-emerald-200 bg-emerald-50/50 p-6"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Ticket issued</p><h2 className="mt-2 font-display text-2xl font-extrabold text-slate-900">{issuedBooking.pnr}</h2><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Booking</dt><dd className="font-bold">{issuedBooking.reference}</dd></div>{issuedBooking.duffelOrderId && <div className="flex justify-between gap-3"><dt className="text-slate-500">Duffel order</dt><dd className="break-all text-right font-mono text-xs font-bold">{issuedBooking.duffelOrderId}</dd></div>}<div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-bold text-emerald-700">Ticketed</dd></div></dl></div>}
        {paymentFlow?.next.type === "stripe_elements" && paymentFlow.next.clientSecret && paymentFlow.next.publishableKey && <div className="surface p-6"><h2 className="font-display text-lg font-extrabold text-slate-900">Secure card payment</h2><div className="mt-5"><Suspense fallback={<InlineLoader />}><StripePaymentPanel clientSecret={paymentFlow.next.clientSecret} publishableKey={paymentFlow.next.publishableKey} paymentReference={paymentFlow.payment.reference} /></Suspense></div></div>}
        {["submitted", "in_review", "quoted"].includes(detail.status) && <div className="surface p-6"><h2 className="font-display text-lg font-extrabold text-slate-900">Request changes</h2><textarea className="textarea mt-4" placeholder="Describe the date, route, or passenger change" value={change} onChange={(event) => setChange(event.target.value)} /><button className="btn-secondary mt-3 w-full" disabled={!change.trim() || busy === "change"} onClick={() => run("change", () => bookingService.requestChange(reference, change).then(() => setChange("")))}>Send change request</button></div>}

        {(ticket?.cancellation || (ticket?.refunds?.length ?? 0) > 0) && <div className="surface border border-amber-200 bg-amber-50/40 p-6">
          <div className="flex items-center gap-2"><RotateCcw className="h-5 w-5 text-amber-700" /><h2 className="font-display text-lg font-extrabold text-slate-900">Cancellation & refund</h2></div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Booking status</dt><dd className="font-bold uppercase text-amber-700">{ticket!.status}</dd></div>
            {ticket!.cancellation?.status && <div className="flex justify-between"><dt className="text-slate-500">Cancellation</dt><dd className="font-bold uppercase">{ticket!.cancellation.status}</dd></div>}
            {typeof ticket!.cancellation?.refundAmount === "number" && <div className="flex justify-between"><dt className="text-slate-500">Refund</dt><dd className="font-bold text-emerald-700">{formatMoney(ticket!.cancellation.refundAmount, ticket!.cancellation.refundCurrency || ticket!.currency)}</dd></div>}
            {ticket!.cancellation?.confirmedAt && <div className="flex justify-between"><dt className="text-slate-500">Confirmed</dt><dd className="font-bold">{formatDate(ticket!.cancellation.confirmedAt, true)}</dd></div>}
          </dl>
          {(ticket!.refunds?.length ?? 0) > 0 && <div className="mt-4 border-t border-amber-100 pt-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Refund payments</p><ul className="mt-2 space-y-1 text-sm">{ticket!.refunds!.map((r, i) => <li key={i} className="flex justify-between"><span className="text-slate-500">{formatDate(r.at)}</span><strong className="text-emerald-700">{formatMoney(r.amount, ticket!.currency)}</strong></li>)}</ul></div>}
        </div>}

        {detail.cancellationRequestedAt
          ? <div className="surface p-6"><div className="flex items-center gap-2"><RotateCcw className="h-5 w-5 text-amber-700" /><h2 className="font-display text-lg font-extrabold text-slate-900">Cancellation requested</h2></div><p className="mt-3 text-sm text-slate-500">Requested on {formatDate(detail.cancellationRequestedAt, true)}. Our team is reviewing it and will process any eligible refund — track the status above.</p></div>
          : ["submitted", "in_review", "quoted"].includes(detail.status)
            ? <div className="surface p-6"><h2 className="font-display text-lg font-extrabold text-slate-900">Cancel request</h2><p className="mt-2 text-sm text-slate-500">You can cancel now while no payment has been made.</p><button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-rose-600 hover:bg-rose-50" disabled={busy === "cancel"} onClick={() => run("cancel", () => bookingService.cancel(reference))}><XCircle className="h-4 w-4" />Cancel request</button></div>
            : ["awaiting_payment", "confirmed", "ticketed"].includes(detail.status)
              ? <div className="surface p-6"><h2 className="font-display text-lg font-extrabold text-slate-900">Cancel booking</h2><p className="mt-2 text-sm text-slate-500">Cancelling a paid or ticketed booking is handled by our team, who process the airline refund. Tell us why:</p><textarea className="textarea mt-3" placeholder="Reason for cancellation" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /><button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-rose-600 hover:bg-rose-50" disabled={!cancelReason.trim() || busy === "cancel"} onClick={() => run("cancel", () => bookingService.requestCancellation(reference, cancelReason).then(() => setCancelReason("")))}><XCircle className="h-4 w-4" />Request cancellation</button></div>
              : null}
      </aside>
    </div> : null}
  </main>;
}

function Info({ label, value }: { label: string; value?: string }) {
  return <div className="surface-soft p-4"><span className="text-[10px] font-bold uppercase text-slate-400">{label}</span><strong className="mt-1 block text-sm text-slate-900">{value || "—"}</strong></div>;
}

function SectionHeading({ icon, title }: { icon: ReactNode; title: string }) {
  return <div className="flex items-center gap-2">{icon}<h2 className="font-display text-xl font-extrabold text-slate-900">{title}</h2></div>;
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return <div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-0.5 break-words text-sm font-semibold text-slate-800">{value || "—"}</dd></div>;
}

function prettyLabel(value?: string) {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function paxSummary(passengers?: { adults: number; children: number; infants: number }) {
  if (!passengers) return "—";
  const parts: string[] = [];
  if (passengers.adults) parts.push(`${passengers.adults} adult${passengers.adults > 1 ? "s" : ""}`);
  if (passengers.children) parts.push(`${passengers.children} child${passengers.children > 1 ? "ren" : ""}`);
  if (passengers.infants) parts.push(`${passengers.infants} infant${passengers.infants > 1 ? "s" : ""}`);
  return parts.join(", ") || "—";
}
