// Google Flights searches for a booking, written the way someone would
// type them.
import { itineraryKind, splitDirections } from "./model.js";

function searchUrl(from, to, depart, returns) {
  let query = `Flights from ${from} to ${to} on ${depart}`;
  if (returns) query += ` returning ${returns}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}

const date = (leg) => leg.departs.slice(0, 10);

// One search for a one-way or round trip. A multi-city booking gets one
// search per direction, since a typed search can't describe it.
// Takes legs sorted by departure.
export function googleFlightsSearches(legs) {
  const directions = splitDirections(legs);
  const kind = itineraryKind(legs);
  const [out, back] = directions;
  if (kind === "oneway") {
    return [{ label: "Find in Google Flights", url: searchUrl(out[0].from, out.at(-1).to, date(out[0])) }];
  }
  if (kind === "roundtrip") {
    return [{ label: "Find in Google Flights", url: searchUrl(out[0].from, out.at(-1).to, date(out[0]), date(back[0])) }];
  }
  return directions.map((direction) => ({
    label: `Find ${direction[0].from} → ${direction.at(-1).to}`,
    url: searchUrl(direction[0].from, direction.at(-1).to, date(direction[0])),
  }));
}
