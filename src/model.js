// Rules about flights that don't depend on the page.
//
//   Trip       e.g. "NYC → LA, October"
//   Option     one way of doing the trip; holds one or more itineraries
//   Itinerary  one booking with one price: a one-way, round-trip or
//              multi-city ticket
//   Leg        a single flight, with local times at each airport
import { DateTime } from "luxon";

export function departure(leg) {
  return DateTime.fromISO(leg.departs, { zone: leg.fromTz });
}

export function arrival(leg) {
  return DateTime.fromISO(leg.arrives, { zone: leg.toTz });
}

export function minutesBetween(start, end) {
  return end.diff(start, "minutes").minutes;
}

export function flightMinutes(leg) {
  return minutesBetween(departure(leg), arrival(leg));
}

export function sortByDeparture(legs) {
  return [...legs].sort((a, b) => departure(a) - departure(b));
}

// A connection is a change of planes at the same airport within a day.
// Anything else, like the return half of a round trip, starts a new
// direction.
export function isConnection(previous, next) {
  if (previous.to !== next.from) return false;
  return minutesBetween(arrival(previous), departure(next)) < 24 * 60;
}

// Groups legs, sorted by departure, into directions: runs of connecting
// flights from one place to another.
export function splitDirections(legs) {
  const directions = [];
  legs.forEach((leg, i) => {
    if (i > 0 && isConnection(legs[i - 1], leg)) directions.at(-1).push(leg);
    else directions.push([leg]);
  });
  return directions;
}

export const KIND_LABELS = { oneway: "One way", roundtrip: "Round trip", multicity: "Multi-city" };

export function itineraryKind(legs) {
  const directions = splitDirections(legs);
  if (directions.length === 1) return "oneway";
  const [first, last] = [directions[0], directions.at(-1)];
  if (directions.length === 2 && last.at(-1).to === first[0].from) return "roundtrip";
  return "multicity";
}

// "JFK ⇄ LAX" for a round trip. Otherwise each airport where a direction
// starts or ends, in order: "JFK → LAX → SEA".
export function routeText(legs) {
  const directions = splitDirections(legs);
  if (itineraryKind(legs) === "roundtrip") {
    const out = directions[0];
    return `${out[0].from} ⇄ ${out.at(-1).to}`;
  }
  const stops = [];
  for (const direction of directions) {
    if (stops.at(-1) !== direction[0].from) stops.push(direction[0].from);
    stops.push(direction.at(-1).to);
  }
  return stops.join(" → ");
}
