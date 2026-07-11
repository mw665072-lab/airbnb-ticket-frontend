import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { bookingService, publicService } from "@/api/services";
import { FieldError } from "@/components/ui";
import { createIdempotencyKey } from "@/lib/idempotency";
import { formatMoney } from "@/lib/format";
import { useAuthStore } from "@/store/auth";
import { useBookingDraftStore } from "@/store/bookingDraft";
import { useToastStore } from "@/store/toast";
import { getErrorMessage } from "@/api/client";
import type { AvailableService } from "@/types/api";

const passenger = z.object({
  type: z.enum(["adult", "child", "infant"]),
  title: z.enum(["mr", "mrs", "ms", "miss"]),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  gender: z.enum(["m", "f"]),
  dob: z.string().min(1),
  email: z.email(),
  phone: z.string().min(8),
  nationality: z.string().length(2),
  passportNumber: z.string().min(5),
  passportExpiry: z.string().min(1),
  passportIssuingCountry: z.string().length(2),
  responsibleAdultIndex: z.number().int().min(0).optional().nullable(),
}).refine((data) => data.type !== "infant" || typeof data.responsibleAdultIndex === "number", {
  message: "Infants require a responsible adult",
  path: ["responsibleAdultIndex"],
});

const schema = z.object({
  contact: z.object({ name: z.string().min(2), email: z.email(), phone: z.string().min(8) }),
  passengers: z.array(passenger).min(1).max(9),
  notes: z.string().max(1000).optional(),
});
type Form = z.infer<typeof schema>;

const blank = (type: "adult" | "child" | "infant", user?: { name?: string; email?: string; phone?: string }): Form["passengers"][number] => ({
  type,
  title: "mr",
  firstName: type === "adult" ? (user?.name?.split(" ")[0] || "") : "",
  lastName: type === "adult" ? (user?.name?.split(" ").slice(1).join(" ") || "") : "",
  gender: "m",
  dob: "",
  email: user?.email || "",
  phone: user?.phone || "",
  nationality: "PK",
  passportNumber: "",
  passportExpiry: "",
  passportIssuingCountry: "PK",
  responsibleAdultIndex: type === "infant" ? 0 : null,
});

function serviceLabel(service: AvailableService) {
  const type = String(service.type || "extra").replaceAll("_", " ");
  const meta = service.metadata || {};
  const name = typeof meta.name === "string" ? meta.name : typeof meta.description === "string" ? meta.description : "";
  return name ? `${type} · ${name}` : type;
}

export function BookingCreatePage() {
  const draftOffer = useBookingDraftStore((s) => s.offer);
  const search = useBookingDraftStore((s) => s.search);
  const clear = useBookingDraftStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const push = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const [liveOffer, setLiveOffer] = useState(draftOffer);
  const [loadingOffer, setLoadingOffer] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const offer = liveOffer || draftOffer;
  const count = search ? search.passengers.adults + search.passengers.children + search.passengers.infants : 0;
  const defaults = search
    ? [...Array(search.passengers.adults)].map(() => blank("adult", user || undefined))
      .concat([...Array(search.passengers.children)].map(() => blank("child")), [...Array(search.passengers.infants)].map(() => blank("infant")))
    : [];
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { contact: { name: user?.name || "", email: user?.email || "", phone: user?.phone || "" }, passengers: defaults, notes: "" },
  });
  const fields = useFieldArray({ control: form.control, name: "passengers" });

  useEffect(() => {
    if (fields.fields.length === 0 && defaults.length) form.reset({ ...form.getValues(), passengers: defaults });
  }, []);

  useEffect(() => {
    if (!draftOffer?.offerId) return;
    setLoadingOffer(true);
    publicService.offer(draftOffer.offerId)
      .then((result) => setLiveOffer(result.data.offer))
      .catch(() => setLiveOffer(draftOffer))
      .finally(() => setLoadingOffer(false));
  }, [draftOffer?.offerId]);

  const availableServices = offer?.availableServices || [];
  const selectedServices = useMemo(
    () => availableServices.filter((service) => selectedServiceIds.includes(service.id)),
    [availableServices, selectedServiceIds]
  );
  const servicesTotal = selectedServices.reduce((sum, service) => sum + Number(service.totalAmount || 0), 0);
  const total = Number(offer?.totalAmount || 0) + servicesTotal;

  if (!offer || !search) {
    return (
      <main className="page-shell py-16">
        <div className="surface mx-auto max-w-xl p-10 text-center">
          <h1 className="font-display text-3xl font-extrabold text-slate-900">Choose a flight first</h1>
          <p className="mt-3 text-sm text-slate-500">The booking draft is empty or expired.</p>
          <Link className="btn-primary mt-6" to="/search">Search flights</Link>
        </div>
      </main>
    );
  }

  const submit = async (values: Form) => {
    try {
      const result = await bookingService.create({
        offerId: offer.offerId,
        selectedServices: selectedServiceIds.map((id) => ({ id })),
        contact: values.contact,
        trip: {
          type: search.tripType,
          segments: search.segments,
          ...(search.returnDate ? { returnDate: search.returnDate } : {}),
          cabinClass: search.cabinClass,
          passengers: search.passengers,
        },
        passengers: values.passengers,
        notes: values.notes,
      }, createIdempotencyKey());
      const ref = result.data.bookingRequest.reference;
      push(result.message || "Booking request submitted");
      clear();
      navigate(`/track/${ref}?email=${encodeURIComponent(values.contact.email)}`);
    } catch (e) {
      push(getErrorMessage(e), "error");
    }
  };

  return (
    <main className="page-shell py-10">
      <Link to="/search" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Back to offers</Link>
      <div className="mt-6 grid gap-7 lg:grid-cols-[1fr_360px]">
        <form className="surface p-6 sm:p-8" onSubmit={form.handleSubmit(submit)}>
          <p className="eyebrow">Passenger details</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-.04em] text-slate-900">Submit your booking request.</h1>
          <p className="mt-2 text-sm text-slate-500">Enter names exactly as shown on each traveller's passport.</p>

          <section className="mt-8">
            <h2 className="font-display text-lg font-extrabold text-slate-900">Primary contact</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><label className="label">Full name</label><input className="field" {...form.register("contact.name")} /><FieldError message={form.formState.errors.contact?.name?.message} /></div>
              <div><label className="label">Phone</label><input className="field" {...form.register("contact.phone")} /><FieldError message={form.formState.errors.contact?.phone?.message} /></div>
              <div className="sm:col-span-2"><label className="label">Email</label><input className="field" type="email" {...form.register("contact.email")} /><FieldError message={form.formState.errors.contact?.email?.message} /></div>
            </div>
          </section>

          {availableServices.length ? (
            <section className="mt-9">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-extrabold text-slate-900">Seats, bags & extras</h2>
                {loadingOffer ? <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" /> : null}
              </div>
              <div className="mt-4 space-y-3">
                {availableServices.map((service) => {
                  const checked = selectedServiceIds.includes(service.id);
                  return (
                    <label key={service.id} className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 ${checked ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
                      <span className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1" checked={checked} onChange={(event) => setSelectedServiceIds((ids) => event.target.checked ? [...ids, service.id] : ids.filter((id) => id !== service.id))} />
                        <span>
                          <strong className="block text-sm capitalize text-slate-900">{serviceLabel(service)}</strong>
                          <span className="text-xs text-slate-500">{service.passengerIds?.length ? `${service.passengerIds.length} passenger option` : "Passenger option"}{service.segmentIds?.length ? ` · ${service.segmentIds.length} segment option` : ""}</span>
                        </span>
                      </span>
                      <strong className="text-sm text-slate-900">{formatMoney(service.totalAmount || 0, service.currency || offer.currency)}</strong>
                    </label>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="mt-9 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              {loadingOffer ? "Checking seats, bags and extras..." : "No paid seats, bags or extras are available for this offer."}
            </section>
          )}

          <section className="mt-9 space-y-6">
            <h2 className="font-display text-lg font-extrabold text-slate-900">Travellers ({count})</h2>
            {fields.fields.map((field, index) => (
              <div key={field.id} className="surface-soft p-5">
                <div className="flex items-center justify-between">
                  <strong className="font-display text-slate-900">Passenger {index + 1}</strong>
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase text-slate-500">{form.watch(`passengers.${index}.type`)}</span>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div><label className="label">Title</label><select className="field" {...form.register(`passengers.${index}.title`)}><option value="mr">Mr</option><option value="mrs">Mrs</option><option value="ms">Ms</option><option value="miss">Miss</option></select></div>
                  <div><label className="label">First name</label><input className="field" {...form.register(`passengers.${index}.firstName`)} /></div>
                  <div><label className="label">Last name</label><input className="field" {...form.register(`passengers.${index}.lastName`)} /></div>
                  <div><label className="label">Gender</label><select className="field" {...form.register(`passengers.${index}.gender`)}><option value="m">Male</option><option value="f">Female</option></select></div>
                  <div><label className="label">Date of birth</label><input className="field" type="date" {...form.register(`passengers.${index}.dob`)} /></div>
                  <div><label className="label">Nationality</label><input className="field uppercase" maxLength={2} {...form.register(`passengers.${index}.nationality`)} /></div>
                  <div><label className="label">Email</label><input className="field" type="email" {...form.register(`passengers.${index}.email`)} /></div>
                  <div><label className="label">Phone</label><input className="field" {...form.register(`passengers.${index}.phone`)} /></div>
                  <div><label className="label">Passport number</label><input className="field uppercase" {...form.register(`passengers.${index}.passportNumber`)} /></div>
                  <div><label className="label">Passport expiry</label><input className="field" type="date" {...form.register(`passengers.${index}.passportExpiry`)} /></div>
                  <div><label className="label">Issuing country</label><input className="field uppercase" maxLength={2} {...form.register(`passengers.${index}.passportIssuingCountry`)} /></div>
                  {form.watch(`passengers.${index}.type`) === "infant" ? (
                    <div>
                      <label className="label">Responsible adult</label>
                      <select className="field" {...form.register(`passengers.${index}.responsibleAdultIndex`, { valueAsNumber: true })}>
                        <option value="">Select an adult passenger</option>
                        {defaults.map((p, i) => p.type === "adult" ? <option key={i} value={i}>{`Passenger ${i + 1} (${p.firstName} ${p.lastName})`}</option> : null)}
                      </select>
                      <FieldError message={form.formState.errors.passengers?.[index]?.responsibleAdultIndex?.message} />
                    </div>
                  ) : null}
                </div>
                {form.formState.errors.passengers?.[index] ? <p className="mt-3 text-xs font-bold text-rose-600">Complete all required passenger fields with valid values.</p> : null}
              </div>
            ))}
          </section>

          <div className="mt-8"><label className="label">Travel notes (optional)</label><textarea className="textarea" placeholder="Meal, mobility, or itinerary preferences" {...form.register("notes")} /></div>
          <button className="btn-primary mt-7 w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Submit secure request</button>
        </form>

        <aside className="surface h-fit p-6 lg:sticky lg:top-28">
          <p className="eyebrow">Selected offer</p>
          <div className="mt-5 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 font-display font-extrabold text-blue-800">{offer.airline.code}</div>
            <div><strong className="block text-slate-900">{offer.airline.name}</strong><span className="text-xs text-slate-500">{offer.slices[0]?.flightNumber}</span></div>
          </div>
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
            <div><strong className="font-display text-2xl text-slate-900">{offer.slices[0]?.origin.iata}</strong><p className="text-xs text-slate-500">{offer.slices[0]?.origin.city}</p></div>
            <span className="text-blue-700">→</span>
            <div className="text-right"><strong className="font-display text-2xl text-slate-900">{offer.slices.at(-1)?.destination.iata}</strong><p className="text-xs text-slate-500">{offer.slices.at(-1)?.destination.city}</p></div>
          </div>
          <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
            <div className="flex items-end justify-between"><span className="text-sm font-semibold text-slate-500">Flight fare</span><strong className="text-slate-900">{formatMoney(offer.totalAmount, offer.currency)}</strong></div>
            {selectedServices.length ? <div className="flex items-end justify-between"><span className="text-sm font-semibold text-slate-500">Selected extras</span><strong className="text-slate-900">{formatMoney(servicesTotal, offer.currency)}</strong></div> : null}
            <div className="flex items-end justify-between border-t border-slate-100 pt-3"><span className="text-sm font-semibold text-slate-500">Estimated total</span><strong className="font-display text-2xl text-slate-900">{formatMoney(total, offer.currency)}</strong></div>
          </div>
          <p className="mt-5 flex gap-2 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />Paid extras are revalidated with Duffel before payment and included when the ticket is issued.</p>
        </aside>
      </div>
    </main>
  );
}
