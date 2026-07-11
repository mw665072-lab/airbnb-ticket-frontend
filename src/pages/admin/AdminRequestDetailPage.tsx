import { ArrowLeft, LoaderCircle, MessageSquareText, PlaneTakeoff, Send, WalletCards } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getErrorMessage } from "@/api/client";
import { adminService } from "@/api/services";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorState, InlineLoader } from "@/components/ui";
import { createIdempotencyKey } from "@/lib/idempotency";
import { formatDate, formatMoney } from "@/lib/format";
import { qk } from "@/query/keys";
import { useAdminRequest } from "@/query/hooks";
import { useToastStore } from "@/store/toast";

export default function AdminRequestDetailPage() {
  const { reference = "" } = useParams();
  const query = useAdminRequest(reference);
  const qc = useQueryClient();
  const push = useToastStore((state) => state.push);
  const [busy, setBusy] = useState("");
  const [reply, setReply] = useState("");
  const [quote, setQuote] = useState({ amount: "", currency: "USD", baseFare: "", apiFee: "", gatewayFee: "", margin: "", expiresInHours: "72", message: "" });
  const [duffel, setDuffel] = useState({ offerId: "", acceptNewPrice: false, gateway: "regional" as const, method: "bank_transfer", referenceNote: "" });
  const detail = query.data?.data.bookingRequest;

  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: qk.adminRequest(reference) }),
    qc.invalidateQueries({ queryKey: ["admin", "requests"] }),
    qc.invalidateQueries({ queryKey: qk.adminDashboard }),
  ]);
  const run = async (key: string, action: () => Promise<unknown>, message = "Request updated") => {
    setBusy(key);
    try { await action(); await refresh(); push(message); }
    catch (error) { push(getErrorMessage(error), "error"); }
    finally { setBusy(""); }
  };

  if (query.isPending) return <InlineLoader />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  if (!detail) return null;
  const first = detail.trip?.segments[0];
  const offerId = duffel.offerId.trim() || detail.offerId || "";
  const hasSucceededPayment = detail.linkedPayment?.status === "succeeded";

  return <div>
    <Link to="/admin/requests" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500"><ArrowLeft className="h-4 w-4" />Booking requests</Link>
    <div className="mt-5 grid gap-6 xl:grid-cols-[1fr_390px]">
      <section className="space-y-6">
        <div className="surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{detail.reference}</p><h2 className="mt-2 font-display text-3xl font-extrabold text-slate-900">{detail.contact?.name || detail.contactName}</h2><p className="mt-1 text-sm text-slate-500">{detail.contact?.email} · {detail.contact?.phone}</p></div><StatusBadge status={detail.status} /></div>
          <div className="mt-7 grid gap-4 sm:grid-cols-4">
            <Info label="Route" value={detail.route || `${first?.origin || "—"} → ${detail.trip?.segments.at(-1)?.destination || "—"}`} />
            <Info label="Departure" value={formatDate(detail.departureDate || first?.departureDate)} />
            <Info label="Passengers" value={String(detail.passengers?.length || detail.paxCount || 0)} />
            <Info label="Created" value={formatDate(detail.createdAt, true)} />
          </div>
        </div>
        <div className="surface p-6"><h3 className="font-display text-xl font-extrabold text-slate-900">Passenger manifest</h3><div className="mt-5 space-y-3">{(detail.passengers || []).map((passenger, index) => <div className="surface-soft grid gap-3 p-4 sm:grid-cols-4" key={index}><Info label="Name" value={`${passenger.firstName} ${passenger.lastName}`} /><Info label="Type" value={passenger.type} /><Info label="Passport" value={passenger.passportNumber} /><Info label="Expiry" value={formatDate(passenger.passportExpiry)} /></div>)}</div></div>
        <div className="surface p-6"><div className="flex items-center gap-2"><MessageSquareText className="h-5 w-5 text-blue-800" /><h3 className="font-display text-xl font-extrabold text-slate-900">Request conversation</h3></div><div className="mt-5 max-h-80 space-y-3 overflow-auto">{(detail.messages || []).map((message) => <div key={message.id} className={`flex ${message.sender === "admin" ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.sender === "admin" ? "bg-blue-800 text-white" : "bg-slate-100 text-slate-700"}`}><p className="text-sm">{message.body}</p><span className="mt-1 block text-[10px] opacity-60">{formatDate(message.createdAt, true)}</span></div></div>)}</div><div className="mt-4 flex gap-2"><textarea className="textarea min-h-12 flex-1" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to customer" /><button className="btn-primary self-end" disabled={!reply.trim() || busy === "reply"} onClick={() => run("reply", () => adminService.replyRequest(reference, reply).then(() => setReply("")))}>{busy === "reply" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></div></div>
      </section>
      <aside className="space-y-5">
        <div className="surface p-5"><h3 className="font-display text-lg font-extrabold text-slate-900">Issue quote</h3><div className="mt-4 grid grid-cols-2 gap-3"><input className="field" type="number" step="0.01" placeholder="Total amount" value={quote.amount} onChange={(event) => setQuote({ ...quote, amount: event.target.value })} /><input className="field uppercase" placeholder="USD" value={quote.currency} onChange={(event) => setQuote({ ...quote, currency: event.target.value.toUpperCase() })} />{(["baseFare", "apiFee", "gatewayFee", "margin"] as const).map((key) => <input key={key} className="field" type="number" step="0.01" placeholder={key} value={quote[key]} onChange={(event) => setQuote({ ...quote, [key]: event.target.value })} />)}</div><input className="field mt-3" type="number" value={quote.expiresInHours} onChange={(event) => setQuote({ ...quote, expiresInHours: event.target.value })} /><textarea className="textarea mt-3" placeholder="Customer message" value={quote.message} onChange={(event) => setQuote({ ...quote, message: event.target.value })} /><button className="btn-primary mt-3 w-full" disabled={!quote.amount || busy === "quote"} onClick={() => run("quote", () => adminService.quote(reference, { amount: Number(quote.amount), currency: quote.currency, breakdown: { baseFare: Number(quote.baseFare), apiFee: Number(quote.apiFee), gatewayFee: Number(quote.gatewayFee), margin: Number(quote.margin) }, expiresInHours: Number(quote.expiresInHours), message: quote.message, skipApproval: true }))}>{busy === "quote" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <WalletCards className="h-4 w-4" />}Send quote</button>{detail.quote && <p className="mt-3 text-center text-xs text-slate-400">Current quote {formatMoney(detail.quote.amount, detail.quote.currency)}</p>}</div>
        <div className="surface p-5"><h3 className="font-display text-lg font-extrabold text-slate-900">Ticket with Duffel</h3><p className="mt-2 text-xs leading-5 text-slate-500">Creates a real Duffel order from the selected offer. A booking is saved locally only after Duffel confirms it.</p><input className="field mt-4" placeholder={detail.offerId || "Duffel offer ID (off_...)"} value={duffel.offerId} onChange={(event) => setDuffel({ ...duffel, offerId: event.target.value })} />{!hasSucceededPayment && <><input className="field mt-3" placeholder="Payment reference" value={duffel.referenceNote} onChange={(event) => setDuffel({ ...duffel, referenceNote: event.target.value })} /><p className="mt-2 text-xs text-amber-700">No succeeded customer payment was found. Enter the verified manual payment reference.</p></>}<label className="mt-4 flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" className="mt-0.5" checked={duffel.acceptNewPrice} onChange={(event) => setDuffel({ ...duffel, acceptNewPrice: event.target.checked })} />Accept a higher live fare if Duffel reprices this offer</label><button className="btn-primary mt-4 w-full" disabled={!offerId || (!hasSucceededPayment && !duffel.referenceNote.trim()) || busy === "duffel" || detail.status === "ticketed"} onClick={() => run("duffel", () => adminService.bookViaDuffel(reference, { offerId, acceptNewPrice: duffel.acceptNewPrice, ...(hasSucceededPayment ? {} : { paymentReceived: { gateway: duffel.gateway, method: duffel.method, referenceNote: duffel.referenceNote } }) }, createIdempotencyKey()), "Duffel order created and ticket issued")}>{busy === "duffel" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <PlaneTakeoff className="h-4 w-4" />}Book and issue in Duffel</button></div>
      </aside>
    </div>
  </div>;
}

function Info({ label, value }: { label: string; value?: string }) {
  return <div className="surface-soft p-4"><span className="text-[10px] font-bold uppercase text-slate-400">{label}</span><strong className="mt-1 block text-sm">{value || "—"}</strong></div>;
}
