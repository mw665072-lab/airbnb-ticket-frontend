import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, LoaderCircle, Mail, MessageCircle, Printer, Ticket } from "lucide-react";
import { getErrorMessage } from "@/api/client";
import { bookingService } from "@/api/services";
import { useToastStore } from "@/store/toast";
import type { CustomerBooking } from "@/types/api";

export function ETicketActions({ reference, booking, showView = false, onPrint }: { reference: string; booking: CustomerBooking; showView?: boolean; onPrint?: () => void }) {
  const push = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");

  const download = async () => {
    setBusy("download");
    try {
      const blob = await bookingService.eTicketPdf(reference);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eticket-${booking.reference}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) { push(getErrorMessage(error), "error"); }
    finally { setBusy(""); }
  };

  const email = async () => {
    setBusy("email");
    try { const r = await bookingService.emailETicket(reference); push(r.message || "E-ticket sent to your email"); }
    catch (error) { push(getErrorMessage(error), "error"); }
    finally { setBusy(""); }
  };

  const whatsapp = () => {
    const seg = booking.segments[0];
    const trackUrl = `${window.location.origin}/track/${booking.requestReference || reference}`;
    const text = `My e-ticket ${booking.reference} (PNR ${booking.pnr})${seg ? ` — ${seg.origin} → ${seg.destination}` : ""}. Track: ${trackUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  const print = () => { if (onPrint) onPrint(); else navigate(`/account/bookings/${reference}/ticket`); };

  return <div className="flex flex-wrap gap-2">
    {showView && <button className="btn-secondary" onClick={() => navigate(`/account/bookings/${reference}/ticket`)}><Ticket className="h-4 w-4" />View ticket</button>}
    <button className="btn-secondary" onClick={download} disabled={busy === "download"}>{busy === "download" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download PDF</button>
    <button className="btn-secondary" onClick={print}><Printer className="h-4 w-4" />Print</button>
    <button className="btn-secondary" onClick={email} disabled={busy === "email"}>{busy === "email" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}Email</button>
    <button className="btn-secondary !border-emerald-200 !text-emerald-700" onClick={whatsapp}><MessageCircle className="h-4 w-4" />WhatsApp</button>
  </div>;
}
