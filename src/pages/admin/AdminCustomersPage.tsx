import { Ban, CheckCircle2, LoaderCircle, Pencil, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/api/client";
import { adminService } from "@/api/services";
import { ErrorState, InlineLoader, Pagination } from "@/components/ui";
import { formatDate, formatMoney, initials } from "@/lib/format";
import { qk } from "@/query/keys";
import { useAdminCustomer, useAdminCustomers } from "@/query/hooks";
import { useToastStore } from "@/store/toast";

export default function AdminCustomersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", country: "", email: "" });
  const [busy, setBusy] = useState("");
  const deferred = useDeferredValue(search);
  const qc = useQueryClient();
  const push = useToastStore((s) => s.push);
  const list = useAdminCustomers({ page, limit: 20, search: deferred || undefined, sort: "-lastActivityAt" });
  const detail = useAdminCustomer(selected);
  const customer = detail.data?.data.customer;

  useEffect(() => {
    if (customer) setForm({ name: customer.name, phone: customer.phone || "", country: customer.country || "", email: customer.email });
    setEditing(false);
  }, [customer]);

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: qk.adminCustomer(selected) }), qc.invalidateQueries({ queryKey: ["admin", "customers"] })]);

  const saveDetails = async () => {
    setBusy("save");
    try { await adminService.updateCustomer(selected, form); await refresh(); setEditing(false); push("Customer updated"); }
    catch (e) { push(getErrorMessage(e), "error"); }
    finally { setBusy(""); }
  };

  const toggleBlock = async () => {
    if (!customer) return;
    setBusy("block");
    try { await adminService.setCustomerBlocked(selected, !customer.blocked); await refresh(); push(customer.blocked ? "Customer unblocked" : "Customer blocked"); }
    catch (e) { push(getErrorMessage(e), "error"); }
    finally { setBusy(""); }
  };

  return <div>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="eyebrow">Customer records</p><h2 className="mt-2 font-display text-3xl font-extrabold text-slate-900">A complete travel relationship.</h2></div>
      <div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input className="field min-w-72 pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email or phone" /></div>
    </div>

    <div className="mt-7 grid gap-6 2xl:grid-cols-[1fr_430px]">
      <div>
        <div className="surface overflow-hidden">{list.isPending ? <InlineLoader /> : list.isError ? <ErrorState error={list.error} /> : <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Customer</th><th>Country</th><th>Requests</th><th>Bookings</th><th>Total spent</th><th>Last activity</th></tr></thead><tbody>{(list.data?.data.customers || []).map((c) => <tr key={c.id} onClick={() => setSelected(c.id)} className={`cursor-pointer hover:bg-blue-50/40 ${selected === c.id ? "bg-blue-50/60" : ""}`}><td><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-xs font-extrabold text-blue-800">{initials(c.name)}</span><div><strong className="flex items-center gap-2">{c.name}{c.blocked && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase text-rose-700">Blocked</span>}</strong><span className="text-xs text-slate-400">{c.email}</span></div></div></td><td>{c.country || "—"}</td><td>{c.stats?.requests || 0}</td><td>{c.stats?.bookings || 0}</td><td>{formatMoney(c.stats?.totalSpent, "USD")}</td><td>{formatDate(c.lastActivityAt, true)}</td></tr>)}</tbody></table></div>}</div>
        <Pagination page={page} totalPages={list.data?.meta?.totalPages || 1} onPage={setPage} />
      </div>

      <aside className="surface h-fit p-6 2xl:sticky 2xl:top-24">{!selected ? <p className="py-10 text-center text-sm text-slate-500">Select a customer to open their details, refunds, cancelled tickets, and timeline.</p> : detail.isPending ? <InlineLoader /> : detail.isError ? <ErrorState error={detail.error} /> : customer ? <>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-900 font-display text-lg font-extrabold text-white">{initials(customer.name)}</span><div><h3 className="flex items-center gap-2 font-display text-xl font-extrabold text-slate-900">{customer.name}{customer.blocked && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700">Blocked</span>}</h3><p className="text-sm text-slate-500">{customer.email}</p><p className="text-xs text-slate-400">{customer.phone}</p></div></div>
          <button className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-800" title="Edit details" onClick={() => setEditing((v) => !v)}><Pencil className="h-4 w-4" /></button>
        </div>

        {editing && <div className="mt-5 space-y-3 rounded-2xl border border-slate-200 p-4">
          <div className="grid grid-cols-2 gap-3"><div><label className="label">Name</label><input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div><label className="label">Phone</label><input className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div><div><label className="label">Country</label><input className="field uppercase" maxLength={2} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} /></div><div><label className="label">Email</label><input className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div></div>
          <button className="btn-primary w-full" disabled={busy === "save"} onClick={saveDetails}>{busy === "save" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Save details</button>
        </div>}

        <button className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold ${customer.blocked ? "text-emerald-700 hover:bg-emerald-50" : "text-rose-600 hover:bg-rose-50"}`} disabled={busy === "block"} onClick={toggleBlock}>{busy === "block" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : customer.blocked ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}{customer.blocked ? "Unblock customer" : "Block customer"}</button>

        <div className="mt-6 grid grid-cols-3 gap-2 text-center"><div className="surface-soft p-3"><strong className="block">{customer.stats?.requests || customer.requests?.length || 0}</strong><span className="text-[9px] uppercase text-slate-400">Requests</span></div><div className="surface-soft p-3"><strong className="block">{customer.stats?.bookings || customer.bookings?.length || 0}</strong><span className="text-[9px] uppercase text-slate-400">Bookings</span></div><div className="surface-soft p-3"><strong className="block">{formatMoney(customer.stats?.totalSpent, "USD")}</strong><span className="text-[9px] uppercase text-slate-400">Spent</span></div></div>

        {(customer.cancelledTickets?.length ?? 0) > 0 && <div className="mt-6"><h4 className="flex items-center gap-2 font-display font-extrabold text-slate-900"><RotateCcw className="h-4 w-4 text-amber-700" />Cancelled tickets</h4><div className="mt-3 space-y-2">{customer.cancelledTickets!.map((t) => <div key={t.reference} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3 text-sm"><div><strong className="block">{t.reference}</strong><span className="text-xs text-slate-400">{t.airline} · {t.pnr}</span></div><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">{t.status}</span></div>)}</div></div>}

        {(customer.refunds?.length ?? 0) > 0 && <div className="mt-6"><h4 className="font-display font-extrabold text-slate-900">Refunds</h4><div className="mt-3 space-y-2">{customer.refunds!.map((r, i) => <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-100 p-3 text-sm"><div><strong className="block text-emerald-700">{formatMoney(r.amount, r.currency)}</strong><span className="text-xs text-slate-400">{r.paymentReference}{r.reason ? ` · ${r.reason}` : ""}</span></div><span className="text-[10px] text-slate-400">{formatDate(r.at, true)}</span></div>)}</div></div>}

        <h4 className="mt-7 font-display font-extrabold text-slate-900">Communication timeline</h4>
        <div className="mt-4 max-h-[470px] space-y-3 overflow-auto">{(customer.timeline || []).map((item, i) => <div className="rounded-2xl border border-slate-100 p-4" key={i}><strong className="block text-xs uppercase text-blue-800">{String(item.type || "Activity")}</strong><p className="mt-1 text-sm text-slate-600">{String(item.message || item.note || item.reference || "")}</p><span className="mt-2 block text-[10px] text-slate-400">{formatDate(String(item.createdAt || item.at || ""), true)}</span></div>)}{!customer.timeline?.length ? <p className="text-sm text-slate-400">No timeline entries returned.</p> : null}</div>
      </> : null}</aside>
    </div>
  </div>;
}
