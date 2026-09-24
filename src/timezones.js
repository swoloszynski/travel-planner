// Timezone names, and reading the ways people type them.
import { DateTime } from "luxon";

export const TIMEZONES = ["UTC", ...Intl.supportedValuesOf("timeZone")];

// Abbreviations people commonly type, each mapped to one representative
// zone. "CST" and the like mean different places around the world, so
// this sticks to the North American, European and a few other common ones.
const ABBREVIATIONS = {
  UTC: "UTC",
  GMT: "UTC",
  ET: "America/New_York",
  EST: "America/New_York",
  EDT: "America/New_York",
  CT: "America/Chicago",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  MT: "America/Denver",
  MST: "America/Denver",
  MDT: "America/Denver",
  PT: "America/Los_Angeles",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  AKST: "America/Anchorage",
  HST: "Pacific/Honolulu",
  BST: "Europe/London",
  CET: "Europe/Paris",
  CEST: "Europe/Paris",
  JST: "Asia/Tokyo",
  AEST: "Australia/Sydney",
  AEDT: "Australia/Sydney",
};

// The zone meant by "America/New_York", "new york", "New_York" or "EST",
// or null if there isn't one.
export function findTimezone(text) {
  const typed = String(text ?? "").trim();
  if (!typed) return null;
  if (ABBREVIATIONS[typed.toUpperCase()]) return ABBREVIATIONS[typed.toUpperCase()];
  const wanted = typed.replace(/\s+/g, "_").toLowerCase();
  return (
    TIMEZONES.find((zone) => zone.toLowerCase() === wanted) ??
    TIMEZONES.find((zone) => zone.toLowerCase().split("/").at(-1) === wanted) ??
    null
  );
}

// "New York · EDT" or "Tokyo · UTC+9", shown next to each suggestion.
export function timezoneLabel(zone) {
  const city = zone.split("/").at(-1).replaceAll("_", " ");
  const now = DateTime.now().setZone(zone);
  const name = now.offsetNameShort.startsWith("GMT") ? `UTC${now.toFormat("Z")}` : now.offsetNameShort;
  return zone === "UTC" ? "UTC" : `${city} · ${name}`;
}
