// The blocks of time an option takes up on the calendar: getting to the
// airport, waiting there, each flight, each layover, and getting away
// from the arrival airport.
import { arrival, departure, doorToDoor, minutesBetween, sortByDeparture, splitDirections } from "./model.js";
import { formatDuration } from "./format.js";

// Directions are found across the whole option rather than per itinerary,
// so a connection between two separate bookings still shows as a layover.
export function optionEvents(option, settings) {
  const legs = sortByDeparture(option.itineraries.flatMap((it) => it.legs));
  return splitDirections(legs).flatMap((direction) => directionEvents(direction, settings));
}

function directionEvents(direction, settings) {
  const first = direction[0];
  const last = direction.at(-1);
  const { start, end } = doorToDoor(direction, settings);
  const atAirport = departure(first).minus({ minutes: settings.minutesAtAirport });
  const events = [];

  if (settings.minutesToAirport > 0) {
    events.push({ type: "transit", title: `Transit to ${first.from}`, start, end: atAirport });
  }
  if (settings.minutesAtAirport > 0) {
    events.push({ type: "airport", title: `At ${first.from} airport`, start: atAirport, end: departure(first) });
  }

  direction.forEach((leg, i) => {
    events.push({ type: "flight", title: flightTitle(leg), start: departure(leg), end: arrival(leg), leg });
    const next = direction[i + 1];
    if (next) {
      const minutes = minutesBetween(arrival(leg), departure(next));
      events.push({
        type: "layover",
        title: `Layover in ${leg.to} (${formatDuration(minutes)})`,
        start: arrival(leg),
        end: departure(next),
      });
    }
  });

  if (settings.minutesFromAirport > 0) {
    events.push({ type: "transit", title: `Transit from ${last.to}`, start: arrival(last), end });
  }
  return events;
}

// Calendars show the times, so the title is only the route.
function flightTitle(leg) {
  return `✈️ ${leg.from} → ${leg.to}`;
}
