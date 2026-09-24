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

function firstLeg(itinerary) {
  return sortByDeparture(itinerary.legs)[0];
}

function lastLeg(itinerary) {
  return sortByDeparture(itinerary.legs).at(-1);
}

// Itineraries in travel order. Ones without flights go last.
export function sortItineraries(itineraries) {
  const start = (it) => (it.legs.length ? departure(firstLeg(it)).toMillis() : Infinity);
  return [...itineraries].sort((a, b) => start(a) - start(b));
}

export function optionCost(itineraries) {
  const priced = itineraries.filter((it) => typeof it.price === "number");
  return {
    total: priced.reduce((sum, it) => sum + it.price, 0),
    unpriced: itineraries.length - priced.length,
    count: itineraries.length,
  };
}

// Places where one itinerary's last flight connects to the next
// itinerary's first. These are separate bookings, so the second airline
// doesn't have to rebook the traveler if the first flight is late.
// Takes itineraries in travel order.
export function selfTransfers(itineraries) {
  const transfers = [];
  for (let i = 1; i < itineraries.length; i++) {
    const [previous, next] = [itineraries[i - 1], itineraries[i]];
    if (!previous.legs.length || !next.legs.length) continue;
    const [landing, takeoff] = [lastLeg(previous), firstLeg(next)];
    if (isConnection(landing, takeoff)) {
      transfers.push({
        itineraryId: next.id,
        airport: landing.to,
        minutes: minutesBetween(arrival(landing), departure(takeoff)),
      });
    }
  }
  return transfers;
}

// From leaving for the departure airport to getting away from the
// arrival airport, for one direction.
export function doorToDoor(direction, settings) {
  const { minutesToAirport, minutesAtAirport, minutesFromAirport } = settings;
  return {
    start: departure(direction[0]).minus({ minutes: minutesAtAirport + minutesToAirport }),
    end: arrival(direction.at(-1)).plus({ minutes: minutesFromAirport }),
  };
}

// How many dates later, by the local calendars, a flight lands than it
// leaves: 1 for a red-eye.
export function dayChange(leg) {
  const date = (localTime) => DateTime.fromISO(localTime.slice(0, 10));
  return date(leg.arrives).diff(date(leg.departs), "days").days;
}
