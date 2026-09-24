// Reads flights from text copied out of Google Flights.
//
// The copied text varies with the part of the page it came from. Rather
// than match one layout, this relies on two things that hold across the
// formats seen so far:
//   1. A date line ("Thu, Oct 8") starts a new direction.
//   2. Within a direction, times and airport codes appear in the same
//      order: departure, arrival, departure, arrival, and so on.
import { DateTime } from "luxon";
import { findAirport } from "./data/airports.js";
import { AIRLINES } from "./data/airlines.js";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DATE_LINE = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\.?,?\s+([a-z]{3})[a-z]*\.?\s+(\d{1,2})\b/i;
const TIME = /(\d{1,2}):(\d{2})\s?([AP]M)/gi;
const CODE_IN_PARENS = /\(([A-Z]{3})\)/g;
const CODE_PAIR = /\b([A-Z]{3})\s*[–—-]\s*([A-Z]{3})\b/g;
// "UA 1432", but not the "AM 12" in "9:32 AM 12".
const FLIGHT_NUMBER = /(?<!\d:\d\d\s?)\b([A-Z][A-Z0-9])\s?(\d{1,4})\b/g;
const PRICE = /[A-Z]{0,3}[$€£¥₹]\s?(\d[\d,]*(?:\.\d{1,2})?)/;

// Longest first, so "Air Canada" wins over a shorter name inside it.
const AIRLINE_NAMES = Object.values(AIRLINES).sort((a, b) => b.length - a.length);

export function parseFlights(text, today = DateTime.now().toISODate()) {
  return {
    legs: splitByDate(text).flatMap((section) => readSection(section, today)),
    price: readPrice(text),
  };
}

function splitByDate(text) {
  const sections = [];
  for (const line of text.split("\n").map((l) => l.trim())) {
    const date = line.match(DATE_LINE);
    if (date) sections.push({ month: date[1], day: Number(date[2]), lines: [] });
    else if (line) sections.at(-1)?.lines.push(line);
  }
  return sections;
}

function readSection({ month, day, lines }, today) {
  // Layover lines repeat the connecting airport's code, which would throw
  // off the pairing of times with codes.
  const text = lines.filter((line) => !/layover/i.test(line)).join(" ");
  const times = [...text.matchAll(TIME)];
  const codes = airportCodes(text);
  const flightNumbers = [...text.matchAll(FLIGHT_NUMBER)].filter(([, carrier]) => carrier in AIRLINES);
  const airlineName = AIRLINE_NAMES.find((name) => new RegExp(`\\b${name}\\b`, "i").test(text)) ?? "";
  const count = Math.min(Math.floor(times.length / 2), Math.floor(codes.length / 2));

  const legs = [];
  let clock = resolveDate(month, day, today, zoneOf(codes[0]));
  for (let i = 0; i < count; i++) {
    const [from, to] = [codes[2 * i], codes[2 * i + 1]];
    const departs = nextTime(times[2 * i], zoneOf(from), clock);
    const arrives = nextTime(times[2 * i + 1], zoneOf(to), departs);
    clock = arrives;

    const number = flightNumbers[i];
    legs.push({
      airline: number ? AIRLINES[number[1]] : airlineName,
      flightNumber: number ? `${number[1]} ${number[2]}` : "",
      from,
      fromTz: findAirport(from)?.tz ?? "",
      departs: localTime(departs),
      to,
      toTz: findAirport(to)?.tz ?? "",
      arrives: localTime(arrives),
    });
  }
  return legs;
}

// Detailed views show "Denver International Airport (DEN)"; summaries
// show "JFK–LAX".
function airportCodes(text) {
  const inParens = [...text.matchAll(CODE_IN_PARENS)].map((m) => m[1]);
  if (inParens.length >= 2) return inParens;
  return [...text.matchAll(CODE_PAIR)].flatMap((m) => [m[1], m[2]]);
}

// An unknown airport's times are read as UTC. They still come out right
// as local times; only the time difference to other airports is lost.
function zoneOf(code) {
  return findAirport(code)?.tz ?? "UTC";
}

// Google Flights leaves out the year. Dates more than 90 days ago are
// taken to be next year.
function resolveDate(monthName, day, today, zone) {
  const now = DateTime.fromISO(today, { zone });
  const month = MONTHS.indexOf(monthName.toLowerCase()) + 1;
  const date = DateTime.fromObject({ year: now.year, month, day }, { zone });
  return date < now.minus({ days: 90 }) ? date.plus({ years: 1 }) : date;
}

// The first moment at or after `after` when clocks in `zone` show the
// matched time. This handles overnight flights and flights that land
// "before" they leave, like Tokyo to Los Angeles.
function nextTime([, hour, minute, half], zone, after) {
  const hour24 = (Number(hour) % 12) + (half.toUpperCase() === "PM" ? 12 : 0);
  const time = after.setZone(zone).set({ hour: hour24, minute: Number(minute), second: 0, millisecond: 0 });
  return time < after ? time.plus({ days: 1 }) : time;
}

function localTime(dateTime) {
  return dateTime.toFormat("yyyy-MM-dd'T'HH:mm");
}

// Google Flights shows the fare as "$342" or "US$1,204". It covers every
// flight in the paste.
function readPrice(text) {
  const match = text.match(PRICE);
  return match ? Number(match[1].replaceAll(",", "")) : null;
}
