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
    events.push({ type: "transit", title: `Travel to ${first.from}`, start, end: atAirport });
  }
  if (settings.minutesAtAirport > 0) {
    events.push({ type: "airport", title: `At ${first.from}`, start: atAirport, end: departure(first) });
  }

  direction.forEach((leg, i) => {
    events.push({ type: "flight", title: flightTitle(leg), start: departure(leg), end: arrival(leg) });
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
    events.push({ type: "transit", title: `Travel from ${last.to}`, start: arrival(last), end });
  }
  return events;
}

// "Delta DL 123: JFK 6:00am → LAX 9:32am", in each airport's local time.
function flightTitle(leg) {
  const carrier = [leg.airline, leg.flightNumber].filter(Boolean).join(" ") || "Flight";
  const time = (dateTime) => dateTime.toFormat("h:mma").toLowerCase();
  return `${carrier}: ${leg.from} ${time(departure(leg))} → ${leg.to} ${time(arrival(leg))}`;
}
