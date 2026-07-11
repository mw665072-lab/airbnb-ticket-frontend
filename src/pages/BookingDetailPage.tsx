import { lazy, Suspense, useState } from "react";
import { ArrowLeft, Banknote, CreditCard, LoaderCircle, MessageSquareText, Send, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getErrorMessage } from "@/api/client";
import { bookingService, paymentService } from "@/api/services";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorState, InlineLoader } from "@/components/ui";
import { createIdempotencyKey } from "@/lib/idempotency";
import { formatDate, formatMoney } from "@/lib/format";
import { useBookingRequest, useInvalidateRequest, useMessages, usePaymentMethods } from "@/query/hooks";
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
  const [billingCountry, setBillingCountry] = useState("PK");
  const [paymentFlow, setPaymentFlow] = useState<PaymentCreateData | null>(null);
  const [issuedBooking, setIssuedBooking] = useState<Booking | null>(null);
  const [busy, setBusy] = useState("");
  const detail = request.data?.data.bookingRequest;
  const methods = usePaymentMethods(billingCountry, detail?.quote?.currency || "USD", detail?.status === "awaiting_payment");

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
        <div className="surface p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{detail.reference}</p><h1 className="mt-2 font-display text-3xl font-extrabold text-slate-900">{detail.route || `${detail.trip?.segments[0]?.origin || ""} → ${detail.trip?.segments.at(-1)?.destination || ""}`}</h1></div><StatusBadge status={detail.status} /></div><div className="mt-7 grid gap-4 sm:grid-cols-3"><Info label="Departure" value={formatDate(detail.departureDate || detail.trip?.segments[0]?.departureDate)} /><Info label="Passengers" value={String(detail.passengers?.length || detail.paxCount || 0)} /><Info label="Created" value={formatDate(detail.createdAt, true)} /></div></div>
        <div className="surface p-6 sm:p-8"><div className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-blue-800" /><h2 className="font-display text-xl font-extrabold text-slate-900">Conversation</h2></div><div className="mt-6 max-h-[430px] space-y-3 overflow-auto pr-1">{messages.isPending ? <InlineLoader /> : (messages.data?.data.messages || []).map((item) => <div key={item.id} className={`flex ${item.sender === "customer" ? "justify-end" : "justify-start"}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 ${item.sender === "customer" ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-700"}`}><p className="text-sm leading-6">{item.body}</p><span className="mt-1 block text-[10px] opacity-60">{formatDate(item.createdAt, true)}</span></div></div>)}</div><div className="mt-5 flex gap-2"><textarea className="textarea min-h-12 flex-1" placeholder="Write a message" value={message} onChange={(event) => setMessage(event.target.value)} /><button className="btn-primary self-end" disabled={!message.trim() || busy === "message"} onClick={send}>{busy === "message" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></div></div>
      </section>
      <aside className="space-y-5">
        <div className="surface p-6"><p className="eyebrow">Quote and payment</p>{detail.quote ? <><strong className="mt-4 block font-display text-3xl text-slate-900">{formatMoney(detail.quote.amount, detail.quote.currency)}</strong><p className="mt-1 text-xs text-slate-400">Expires {formatDate(detail.quote.expiresAt, true)}</p>{detail.quote.breakdown && <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">{Object.entries(detail.quote.breakdown).map(([key, value]) => <div className="flex justify-between" key={key}><span className="text-slate-500">{key.replace(/([A-Z])/g, " $1")}</span><strong>{formatMoney(value, detail.quote!.currency)}</strong></div>)}</div>}</> : <p className="mt-4 text-sm text-slate-500">The operations team has not issued a quote yet.</p>}
          {detail.status === "awaiting_payment" && <div className="mt-6"><label className="label">Billing country</label><input className="field uppercase" maxLength={2} value={billingCountry} onChange={(event) => setBillingCountry(event.target.value.toUpperCase())} /><div className="mt-4 space-y-2">{(methods.data?.data.methods || []).filter((method) => method.available).map((method) => <button key={method.gateway} className="btn-secondary w-full justify-between" onClick={() => createPayment(method.gateway)} disabled={busy.startsWith("pay-")}><span className="flex items-center gap-2"><CreditCard className="h-4 w-4" />{method.label}</span>{busy === `pay-${method.gateway}` ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <span>→</span>}</button>)}{methods.data?.data.manualPaymentAvailable && <button className="btn-primary w-full justify-between" onClick={confirmManualPayment} disabled={Boolean(busy)}><span className="flex items-center gap-2"><Banknote className="h-4 w-4" />Manual payment (demo)</span>{busy === "manual-payment" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <span>→</span>}</button>}</div>{methods.data?.data.manualPaymentAvailable && <p className="mt-3 text-xs leading-5 text-amber-700">Demo mode only: no card is charged. Clicking confirms payment and immediately issues the Duffel test ticket.</p>}</div>}
        </div>
        {issuedBooking && <div className="surface border border-emerald-200 bg-emerald-50/50 p-6"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Ticket issued</p><h2 className="mt-2 font-display text-2xl font-extrabold text-slate-900">{issuedBooking.pnr}</h2><dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Booking</dt><dd className="font-bold">{issuedBooking.reference}</dd></div>{issuedBooking.duffelOrderId && <div className="flex justify-between gap-3"><dt className="text-slate-500">Duffel order</dt><dd className="break-all text-right font-mono text-xs font-bold">{issuedBooking.duffelOrderId}</dd></div>}<div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-bold text-emerald-700">Ticketed</dd></div></dl></div>}
        {paymentFlow?.next.type === "stripe_elements" && paymentFlow.next.clientSecret && paymentFlow.next.publishableKey && <div className="surface p-6"><h2 className="font-display text-lg font-extrabold text-slate-900">Secure card payment</h2><div className="mt-5"><Suspense fallback={<InlineLoader />}><StripePaymentPanel clientSecret={paymentFlow.next.clientSecret} publishableKey={paymentFlow.next.publishableKey} paymentReference={paymentFlow.payment.reference} /></Suspense></div></div>}
        {["submitted", "in_review", "quoted"].includes(detail.status) && <div className="surface p-6"><h2 className="font-display text-lg font-extrabold text-slate-900">Request changes</h2><textarea className="textarea mt-4" placeholder="Describe the date, route, or passenger change" value={change} onChange={(event) => setChange(event.target.value)} /><button className="btn-secondary mt-3 w-full" disabled={!change.trim() || busy === "change"} onClick={() => run("change", () => bookingService.requestChange(reference, change).then(() => setChange("")))}>Send change request</button><button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-rose-600 hover:bg-rose-50" disabled={busy === "cancel"} onClick={() => run("cancel", () => bookingService.cancel(reference))}><XCircle className="h-4 w-4" />Cancel request</button></div>}
      </aside>
    </div> : null}
  </main>;
}

function Info({ label, value }: { label: string; value?: string }) {
  return <div className="surface-soft p-4"><span className="text-[10px] font-bold uppercase text-slate-400">{label}</span><strong className="mt-1 block text-sm text-slate-900">{value || "—"}</strong></div>;
}
