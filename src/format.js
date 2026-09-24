// Turning numbers and times into text, and back.

export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours && rest) return `${hours}h ${rest}m`;
  if (hours) return `${hours}h`;
  return `${rest}m`;
}

export function formatPrice(amount, currency) {
  try {
    return amount.toLocaleString(undefined, { style: "currency", currency });
  } catch {
    return amount.toFixed(2);
  }
}

// "$1,204.50" → 1204.5. Blank text means no price.
export function parsePrice(text) {
  const digits = String(text ?? "").replace(/[^\d.]/g, "");
  const amount = Number(digits);
  return digits && Number.isFinite(amount) ? amount : null;
}

export function isCurrency(code) {
  try {
    new Intl.NumberFormat(undefined, { style: "currency", currency: code });
    return true;
  } catch {
    return false;
  }
}

export function formatDate(dateTime) {
  return dateTime.toFormat("ccc, MMM d");
}

export function formatTime(dateTime) {
  return dateTime.toFormat("h:mm a");
}
