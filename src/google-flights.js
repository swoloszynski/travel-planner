// Google Flights searches for a booking, written the way someone would
// type them. Google applies "Nonstop" and an airline's name as filters.
// It doesn't understand departure times in a typed search, so those can't
// narrow it down.
import { itineraryKind, splitDirections } from "./model.js";

// `directions` are the ones the search covers: one, or two for a round
// trip.
function searchUrl(directions, returns) {
  const [out] = directions;
  const legs = directions.flat();
  const airlines = new Set(legs.map((leg) => leg.airline));
  const [airline] = airlines;
  const filters = [
    directions.every((direction) => direction.length === 1) && "nonstop",
    airlines.size === 1 && airline,
  ].filter(Boolean);

  let query = [...filters, "flights"].join(" ") + ` from ${out[0].from} to ${out.at(-1).to} on ${date(out[0])}`;
  if (returns) query += ` returning ${date(returns[0])}`;
  query = query[0].toUpperCase() + query.slice(1);
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}

const date = (leg) => leg.departs.slice(0, 10);

// One search for a one-way or round trip. A multi-city booking gets one
// search per direction, since a typed search can't describe it.
// Takes legs sorted by departure.
export function googleFlightsSearches(legs) {
  const directions = splitDirections(legs);
  const kind = itineraryKind(legs);
  if (kind === "oneway") {
    return [{ label: "Find in Google Flights", url: searchUrl(directions) }];
  }
  if (kind === "roundtrip") {
    return [{ label: "Find in Google Flights", url: searchUrl(directions, directions[1]) }];
  }
  return directions.map((direction) => ({
    label: `Find ${direction[0].from} → ${direction.at(-1).to}`,
    url: searchUrl([direction]),
  }));
}
