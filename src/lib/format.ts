export function formatMoney(amount?: number, currency = "USD") {
  if (typeof amount !== "number") return "—";
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}
export function formatDate(value?: string, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", ...(withTime ? { timeStyle: "short" as const } : {}) }).format(date);
}
export function durationLabel(minutes?: number) {
  if (!minutes && minutes !== 0) return "—";
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
export function initials(name?: string) {
  return (name || "A").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
export function humanize(value?: string) { return (value || "").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()); }
