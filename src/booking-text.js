// A booking as text, to copy and paste into Add flights elsewhere. It uses
// the Depart/Arrive format parse.js reads, which keeps exact dates, times,
// airports, airline and flight number.
import { sortByDeparture } from "./model.js";
import { formatPrice } from "./format.js";

export function bookingText({ legs, price }, currency) {
  const lines = sortByDeparture(legs).flatMap((leg) => [
    [leg.airline, leg.flightNumber].filter(Boolean).join(" ") || "Flight",
    `Depart ${leg.from} ${leg.departs.replace("T", " ")}`,
    `Arrive ${leg.to} ${leg.arrives.replace("T", " ")}`,
  ]);
  if (typeof price === "number") lines.push(`Price: ${formatPrice(price, currency)}`);
  return lines.join("\n");
}
