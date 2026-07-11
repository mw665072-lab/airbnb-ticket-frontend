import { FileUp, LoaderCircle, Search, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { adminService } from "@/api/services";
import { getErrorMessage } from "@/api/client";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorState, InlineLoader, Pagination } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { qk } from "@/query/keys";
import { useAdminBooking, useAdminBookings } from "@/query/hooks";
import { useToastStore } from "@/store/toast";

export default function AdminBookingsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState("");
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState({ amount: "", reason: "" });
  const deferred = useDeferredValue(search);
  const list = useAdminBookings({ page, limit: 20, search: deferred || undefined, status: status || undefined, sort: "-createdAt" });
  const detail = useAdminBooking(selected);
  const push = useToastStore((s) => s.push);
  const qc = useQueryClient();
  const booking = detail.data?.data.booking;

  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["admin", "bookings"] }),
    selected ? qc.invalidateQueries({ queryKey: qk.adminBooking(selected) }) : Promise.resolve(),
  ]);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
      await refresh();
      push("Booking updated");
    } catch (e) {
      push(getErrorMessage(e), "error");
    } finally {
      setBusy("");
    }
  };

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="eyebrow">Confirmed bookings</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-slate-900">Ticketing and fulfilment.</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="field min-w-64 pl-10" placeholder="PNR, customer, reference" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="field min-w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {["confirmed", "ticketed", "cancelled", "refunded"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-7 grid gap-6 2xl:grid-cols-[1fr_420px]">
        <div>
          <div className="surface overflow-hidden">
            {list.isPending ? <InlineLoader /> : list.isError ? (
              <div className="p-5"><ErrorState error={list.error} /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead><tr><th>Reference</th><th>PNR / Airline</th><th>Customer</th><th>Amount</th><th>Status</th><th>Created</th></tr></thead>
                  <tbody>
                    {(list.data?.data.bookings || []).map((b) => (
                      <tr key={b.reference} className="cursor-pointer hover:bg-blue-50/40" onClick={() => setSelected(b.reference)}>
                        <td className="font-mono text-xs font-bold">{b.reference}</td>
                        <td><strong className="block">{b.pnr || "-"}</strong><span className="text-xs text-slate-400">{b.airline}</span></td>
                        <td>{b.contact?.name || "-"}</td>
                        <td>{formatMoney(b.amount, b.currency)}</td>
                        <td><StatusBadge status={b.status} /></td>
                        <td>{formatDate(b.createdAt, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <Pagination page={page} totalPages={list.data?.meta?.totalPages || 1} onPage={setPage} />
        </div>

        <aside className="surface h-fit p-6 2xl:sticky 2xl:top-24">
          {!selected ? (
            <p className="py-10 text-center text-sm text-slate-500">Select a booking to manage ticket documents, cancellation, or refund.</p>
          ) : detail.isPending ? <InlineLoader /> : detail.isError ? <ErrorState error={detail.error} /> : booking ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.15em] text-slate-400">{booking.reference}</p>
                  <h3 className="mt-2 font-display text-2xl font-extrabold text-slate-900">{booking.pnr || "No PNR"}</h3>
                  <p className="text-sm text-slate-500">{booking.airline}</p>
                </div>
                <StatusBadge status={booking.status} />
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <span className="text-[10px] font-bold uppercase text-slate-400">Amount</span>
                <strong className="mt-1 block text-xl">{formatMoney(booking.amount, booking.currency)}</strong>
              </div>

              {booking.duffelOrderId ? (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <label className="label">Duffel servicing</label>
                  <button className="btn-secondary w-full" disabled={busy === "servicing"} onClick={() => run("servicing", () => adminService.duffelServicing(booking.reference))}>
                    {busy === "servicing" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    Refresh fare rules, seats & extras
                  </button>
                  {booking.availableServices?.length ? <p className="mt-2 text-xs text-slate-500">{booking.availableServices.length} paid extras available from Duffel.</p> : null}
                  {booking.seatMaps?.length ? <p className="mt-2 text-xs text-slate-500">{booking.seatMaps.length} seat map records saved from Duffel.</p> : null}
                  {booking.fareConditions ? <p className="mt-2 text-xs text-slate-500">Fare rules are saved on this booking.</p> : null}
                  {booking.scheduleChanges?.filter((c) => c.status === "pending").map((change) => {
                    const changeId = change.id || change._id || "";
                    return (
                      <div key={changeId} className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                        <strong className="block">Pending airline change</strong>
                        <span>{change.message || change.type}</span>
                        <div className="mt-2 flex gap-2">
                          <button className="rounded-lg bg-white px-2 py-1 font-bold" onClick={() => run(`accept-${changeId}`, () => adminService.resolveScheduleChange(booking.reference, changeId, { status: "accepted", message: "Accepted by admin" }))}>Accept</button>
                          <button className="rounded-lg bg-white px-2 py-1 font-bold" onClick={() => run(`reject-${changeId}`, () => adminService.resolveScheduleChange(booking.reference, changeId, { status: "rejected", message: "Rejected by admin" }))}>Reject</button>
                          <button className="rounded-lg bg-white px-2 py-1 font-bold" onClick={() => run(`note-${changeId}`, () => adminService.resolveScheduleChange(booking.reference, changeId, { status: "noted", message: "Reviewed by admin" }))}>Note</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div className="mt-6">
                <label className="label">Upload e-ticket PDF</label>
                <label className="btn-secondary w-full">
                  <FileUp className="h-4 w-4" />Choose document
                  <input type="file" accept="application/pdf" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) run("upload", () => adminService.uploadDocument(booking.reference, f));
                  }} />
                </label>
                {busy === "upload" ? <p className="mt-2 text-center text-xs text-slate-400">Uploading document...</p> : null}
              </div>

              {booking.documents?.length ? (
                <div className="mt-5 space-y-2">
                  {booking.documents.map((doc) => <a className="block rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-800" href={doc.url} target="_blank" rel="noreferrer" key={doc.url}>{doc.name}</a>)}
                </div>
              ) : null}

              <div className="mt-6 border-t border-slate-100 pt-5">
                <label className="label">Cancel booking</label>
                <textarea className="textarea" placeholder="Cancellation reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                {booking.duffelOrderId ? (
                  <>
                    <button className="btn-secondary mt-3 w-full" disabled={!reason || busy === "duffel-cancel"} onClick={() => run("duffel-cancel", () => adminService.quoteDuffelCancellation(booking.reference, { reason }))}>
                      Quote Duffel cancellation
                    </button>
                    {booking.duffelCancellation?.id ? (
                      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                        <strong className="block text-slate-900">Duffel refund quote</strong>
                        {booking.duffelCancellation.refundAmount !== null && booking.duffelCancellation.refundAmount !== undefined ? (
                          <span>{formatMoney(booking.duffelCancellation.refundAmount, booking.duffelCancellation.refundCurrency || booking.currency)}</span>
                        ) : <span>No refund amount returned.</span>}
                        <button className="btn-danger mt-3 w-full" disabled={busy === "duffel-confirm"} onClick={() => run("duffel-confirm", () => adminService.confirmDuffelCancellation(booking.reference, { reason }))}>
                          {busy === "duffel-confirm" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          Confirm Duffel cancellation
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <button className="btn-danger mt-3 w-full" disabled={!reason || busy === "cancel"} onClick={() => run("cancel", () => adminService.cancelBooking(booking.reference, { reason, triggerRefund: false }))}>
                    {busy === "cancel" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Cancel booking
                  </button>
                )}
              </div>

              {booking.payment ? (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <label className="label">Refund payment</label>
                  <input className="field" type="number" step="0.01" placeholder="Refund amount" value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} />
                  <textarea className="textarea mt-3" placeholder="Refund reason" value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} />
                  <button className="btn-secondary mt-3 w-full" disabled={!refund.amount || !refund.reason || busy === "refund"} onClick={() => run("refund", () => adminService.refund(booking.payment!.reference, { amount: Number(refund.amount), reason: refund.reason }))}>Process refund</button>
                </div>
              ) : null}
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
