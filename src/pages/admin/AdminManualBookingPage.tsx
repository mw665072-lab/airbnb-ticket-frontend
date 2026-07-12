import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LoaderCircle, Pencil, Plane, ShieldCheck, TicketPlus } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { getErrorMessage } from "@/api/client";
import { adminService } from "@/api/services";
import { ETicketActions } from "@/components/ETicketActions";
import { FlightCard } from "@/components/FlightCard";
import { FlightSearchForm } from "@/components/FlightSearchForm";
import { EmptyState, ErrorState, FieldError, InlineLoader } from "@/components/ui";
import { createIdempotencyKey } from "@/lib/idempotency";
import { formatMoney } from "@/lib/format";
import { useETicket, useFlightSearch } from "@/query/hooks";
import { useToastStore } from "@/store/toast";
import type { FlightOffer, ManualBookingPayload, SearchFlightsPayload } from "@/types/api";

// Same passenger shape as the customer booking form (BookingCreatePage).
const passengerSchema = z.object({
  type: z.enum(["adult", "child", "infant"]),
  title: z.enum(["mr", "mrs", "ms", "miss"]),
  firstName: z.string().trim().min(2).regex(/^\p{L}+(?:[ '-]\p{L}+)*$/u, "Letters, spaces, hyphens and apostrophes only"),
  lastName: z.string().trim().min(2).regex(/^\p{L}+(?:[ '-]\p{L}+)*$/u, "Letters, spaces, hyphens and apostrophes only"),
  gender: z.enum(["m", "f"]),
  dob: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(6),
  nationality: z.string().length(2),
  passportNumber: z.string().min(4),
  passportExpiry: z.string().min(1),
  passportIssuingCountry: z.string().length(2),
  responsibleAdultIndex: z.number().int().min(0).nullable().optional(),
}).refine((d) => d.type !== "infant" || typeof d.responsibleAdultIndex === "number", { message: "Infants require a responsible adult", path: ["responsibleAdultIndex"] });

const schema = z.object({
  contact: z.object({ name: z.string().min(2), email: z.string().email(), phone: z.string().min(6) }),
  passengers: z.array(passengerSchema).min(1).max(9),
  notes: z.string().max(1000).optional(),
  payment: z.object({
    gateway: z.enum(["regional", "stripe", "paypal"]),
    method: z.string().min(2),
    status: z.enum(["succeeded", "pending", "processing"]),
    amount: z.number().positive(),
    currency: z.string().length(3),
    referenceNote: z.string().max(200).optional(),
  }),
  pnr: z.string().max(20).optional(),
});
type Form = z.infer<typeof schema>;

const blank = (type: "adult" | "child" | "infant"): Form["passengers"][number] => ({
  type, title: "mr", firstName: "", lastName: "", gender: "m", dob: "", email: "", phone: "",
  nationality: "PK", passportNumber: "", passportExpiry: "", passportIssuingCountry: "PK",
  responsibleAdultIndex: type === "infant" ? 0 : null,
});

function ManualBookingForm({ offer, payload, onCreated }: { offer: FlightOffer; payload: SearchFlightsPayload; onCreated: (ref: string) => void }) {
  const push = useToastStore((s) => s.push);
  const defaults = [
    ...Array(payload.passengers.adults).fill(0).map(() => blank("adult")),
    ...Array(payload.passengers.children).fill(0).map(() => blank("child")),
    ...Array(payload.passengers.infants).fill(0).map(() => blank("infant")),
  ];
  const count = defaults.length;
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      contact: { name: "", email: "", phone: "" },
      passengers: defaults.length ? defaults : [blank("adult")],
      notes: "",
      payment: { gateway: "regional", method: "Cash", status: "succeeded", amount: offer.totalAmount, currency: offer.currency, referenceNote: "" },
      pnr: "",
    },
  });
  const fields = useFieldArray({ control: form.control, name: "passengers" });

  const submit = async (values: Form) => {
    try {
      const body: ManualBookingPayload = {
        contact: values.contact,
        passengers: values.passengers,
        flight: {
          airline: offer.airline.name,
          cabinClass: offer.cabinClass,
          segments: offer.slices.map((s) => ({
            origin: s.origin.iata, destination: s.destination.iata,
            flightNumber: s.flightNumber || `${offer.airline.code || "XX"}-000`,
            departure: s.departure, arrival: s.arrival,
          })),
        },
        payment: { ...values.payment, currency: values.payment.currency.toUpperCase() },
        offerId: offer.offerId,
        notes: values.notes,
        pnr: values.pnr || undefined,
      };
      const res = await adminService.createManualBooking(body, createIdempotencyKey());
      onCreated(res.data.requestReference);
      push("Manual booking created and ticket issued");
    } catch (e) { push(getErrorMessage(e), "error"); }
  };

  return <div className="grid gap-7 lg:grid-cols-[1fr_340px]">
    <form className="space-y-6" onSubmit={form.handleSubmit(submit)}>
      <section className="surface p-6">
        <h3 className="font-display text-lg font-extrabold text-slate-900">Primary contact</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className="label">Full name</label><input className="field" {...form.register("contact.name")} /><FieldError message={form.formState.errors.contact?.name?.message} /></div>
          <div><label className="label">Phone</label><input className="field" {...form.register("contact.phone")} /><FieldError message={form.formState.errors.contact?.phone?.message} /></div>
          <div className="sm:col-span-2"><label className="label">Email</label><input className="field" type="email" {...form.register("contact.email")} /><FieldError message={form.formState.errors.contact?.email?.message} /></div>
        </div>
      </section>

      <section className="surface p-6">
        <h3 className="font-display text-lg font-extrabold text-slate-900">Travellers ({count})</h3>
        <div className="mt-4 space-y-5">
          {fields.fields.map((field, index) => (
            <div key={field.id} className="surface-soft p-5">
              <div className="flex items-center justify-between"><strong className="font-display text-slate-900">Passenger {index + 1}</strong><span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase text-slate-500">{form.watch(`passengers.${index}.type`)}</span></div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div><label className="label">Title</label><select className="field" {...form.register(`passengers.${index}.title`)}><option value="mr">Mr</option><option value="mrs">Mrs</option><option value="ms">Ms</option><option value="miss">Miss</option></select></div>
                <div><label className="label">First name</label><input className="field" {...form.register(`passengers.${index}.firstName`)} /></div>
                <div><label className="label">Last name</label><input className="field" {...form.register(`passengers.${index}.lastName`)} /></div>
                <div><label className="label">Gender</label><select className="field" {...form.register(`passengers.${index}.gender`)}><option value="m">Male</option><option value="f">Female</option></select></div>
                <div><label className="label">Date of birth</label><input className="field" type="date" {...form.register(`passengers.${index}.dob`)} /></div>
                <div><label className="label">Nationality</label><input className="field uppercase" maxLength={2} {...form.register(`passengers.${index}.nationality`)} /></div>
                <div><label className="label">Email</label><input className="field" type="email" {...form.register(`passengers.${index}.email`)} /></div>
                <div><label className="label">Phone</label><input className="field" {...form.register(`passengers.${index}.phone`)} /></div>
                <div><label className="label">Passport / CNIC</label><input className="field uppercase" {...form.register(`passengers.${index}.passportNumber`)} /></div>
                <div><label className="label">Passport expiry</label><input className="field" type="date" {...form.register(`passengers.${index}.passportExpiry`)} /></div>
                <div><label className="label">Issuing country</label><input className="field uppercase" maxLength={2} {...form.register(`passengers.${index}.passportIssuingCountry`)} /></div>
                {form.watch(`passengers.${index}.type`) === "infant" ? (
                  <div><label className="label">Responsible adult</label><select className="field" {...form.register(`passengers.${index}.responsibleAdultIndex`, { valueAsNumber: true })}><option value="">Select an adult passenger</option>{defaults.map((p, i) => p.type === "adult" ? <option key={i} value={i}>{`Passenger ${i + 1}`}</option> : null)}</select><FieldError message={form.formState.errors.passengers?.[index]?.responsibleAdultIndex?.message} /></div>
                ) : null}
              </div>
              {form.formState.errors.passengers?.[index] ? <p className="mt-3 text-xs font-bold text-rose-600">Complete all required passenger fields with valid values.</p> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="surface p-6">
        <h3 className="font-display text-lg font-extrabold text-slate-900">Payment</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className="label">Method</label><input className="field" {...form.register("payment.method")} placeholder="Cash, bank transfer…" /></div>
          <div><label className="label">Gateway</label><select className="field" {...form.register("payment.gateway")}><option value="regional">Regional</option><option value="stripe">Stripe</option><option value="paypal">PayPal</option></select></div>
          <div><label className="label">Payment status</label><select className="field" {...form.register("payment.status")}><option value="succeeded">Succeeded (paid)</option><option value="pending">Pending</option><option value="processing">Processing</option></select></div>
          <div><label className="label">Amount</label><input className="field" type="number" min={0} step="0.01" {...form.register("payment.amount", { valueAsNumber: true })} /></div>
          <div><label className="label">Currency</label><input className="field uppercase" maxLength={3} {...form.register("payment.currency")} /></div>
          <div><label className="label">Payment reference (optional)</label><input className="field" {...form.register("payment.referenceNote")} /></div>
          <div className="sm:col-span-2"><label className="label">PNR (optional — auto-generated if blank)</label><input className="field uppercase" {...form.register("pnr")} /></div>
        </div>
      </section>

      <div><label className="label">Notes (optional)</label><textarea className="textarea" {...form.register("notes")} /></div>
      <button className="btn-primary w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <TicketPlus className="h-4 w-4" />}Create booking & issue ticket</button>
    </form>

    <aside className="surface h-fit p-6 lg:sticky lg:top-28">
      <p className="eyebrow">Selected offer</p>
      <div className="mt-5 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 font-display font-extrabold text-blue-800">{offer.airline.code}</div><div><strong className="block text-slate-900">{offer.airline.name}</strong><span className="text-xs text-slate-500">{offer.slices[0]?.flightNumber}</span></div></div>
      <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div><strong className="font-display text-2xl text-slate-900">{offer.slices[0]?.origin.iata}</strong><p className="text-xs text-slate-500">{offer.slices[0]?.origin.city}</p></div><span className="text-blue-700">→</span><div className="text-right"><strong className="font-display text-2xl text-slate-900">{offer.slices.at(-1)?.destination.iata}</strong><p className="text-xs text-slate-500">{offer.slices.at(-1)?.destination.city}</p></div></div>
      <div className="mt-6 flex items-end justify-between border-t border-slate-100 pt-5"><span className="text-sm font-semibold text-slate-500">Fare</span><strong className="font-display text-2xl text-slate-900">{formatMoney(offer.totalAmount, offer.currency)}</strong></div>
      <p className="mt-5 flex gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />Issued immediately and labelled Booked by Admin.</p>
    </aside>
  </div>;
}

export default function AdminManualBookingPage() {
  const [payload, setPayload] = useState<SearchFlightsPayload | null>(null);
  const [offer, setOffer] = useState<FlightOffer | null>(null);
  const [createdRef, setCreatedRef] = useState("");
  const results = useFlightSearch(offer ? null : payload);
  const eTicket = useETicket(createdRef, Boolean(createdRef));
  const ticket = eTicket.data?.data.booking;

  if (createdRef) return <div className="mx-auto max-w-3xl">
    <div className="surface border border-emerald-200 bg-emerald-50/40 p-6">
      <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-5 w-5" /><h2 className="font-display text-xl font-extrabold text-slate-900">Ticket issued</h2><span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Booked by Admin</span></div>
      {eTicket.isPending ? <div className="mt-5"><InlineLoader label="Loading issued ticket" /></div> : ticket ? <>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div><dt className="text-[10px] font-bold uppercase text-slate-400">Booking ID</dt><dd className="font-bold">{ticket.reference}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase text-slate-400">PNR</dt><dd className="font-bold">{ticket.pnr}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase text-slate-400">Ticket no.</dt><dd className="font-mono text-xs font-bold">{ticket.eTicketNumbers[0]}</dd></div>
          <div><dt className="text-[10px] font-bold uppercase text-slate-400">Payment</dt><dd className="font-bold uppercase text-emerald-700">{ticket.paymentStatus}</dd></div>
        </dl>
        <div className="mt-5"><ETicketActions reference={createdRef} booking={ticket} showView /></div>
      </> : null}
    </div>
    <button className="btn-secondary mt-5" onClick={() => { setCreatedRef(""); setOffer(null); setPayload(null); }}><TicketPlus className="h-4 w-4" />New manual booking</button>
  </div>;

  return <div className="mx-auto max-w-4xl">
    <div className="flex items-center gap-2"><TicketPlus className="h-6 w-6 text-blue-800" /><div><p className="eyebrow">Manual booking</p><h2 className="mt-1 font-display text-3xl font-extrabold text-slate-900">Book a flight on behalf of a customer.</h2></div></div>
    <p className="mt-2 flex items-center gap-2 text-sm text-slate-500"><ShieldCheck className="h-4 w-4 text-amber-600" />Search live flights and capture passenger details just like the customer flow. The ticket is labelled <strong className="text-amber-700">Booked by Admin</strong>.</p>

    <div className="mt-7 space-y-6">
      <section>
        <h3 className="mb-3 font-display text-lg font-extrabold text-slate-900">1. Find the flight</h3>
        {offer ? <div className="surface flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            {offer.airline.logoUrl ? <img src={offer.airline.logoUrl} alt="" className="h-10 w-10 rounded-lg border border-slate-100 object-contain p-1" /> : <span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50"><Plane className="h-5 w-5 text-blue-800" /></span>}
            <div><strong className="block font-display text-slate-900">{offer.slices.map((s) => `${s.origin.iata}→${s.destination.iata}`).join("  ·  ")}</strong><span className="text-xs text-slate-400">{offer.airline.name} · {offer.cabinClass.replace(/_/g, " ")} · {formatMoney(offer.totalAmount, offer.currency)}</span></div>
          </div>
          <button className="btn-secondary" onClick={() => setOffer(null)}><Pencil className="h-4 w-4" />Change flight</button>
        </div> : <>
          <FlightSearchForm initial={payload} onSearch={setPayload} compact />
          {payload && <div className="mt-5">{results.isPending ? <InlineLoader label="Searching live flights" /> : results.isError ? <ErrorState error={results.error} onRetry={() => results.refetch()} /> : results.data?.data.offers.length ? <div className="space-y-4">{results.data.data.offers.map((o) => <FlightCard key={o.offerId} offer={o} onSelect={() => setOffer(o)} />)}</div> : <EmptyState title="No offers found" description="Try different dates, airports, or cabin class." />}</div>}
        </>}
      </section>

      {offer && payload && <section><h3 className="mb-3 font-display text-lg font-extrabold text-slate-900">2. Passenger & payment details</h3><ManualBookingForm offer={offer} payload={payload} onCreated={setCreatedRef} /></section>}
    </div>
  </div>;
}
