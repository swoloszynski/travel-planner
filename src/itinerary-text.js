// An option's flights as plain text, to send in a text message. Directions
// are found across the whole option, so a connection between two separate
// bookings reads as a layover. The settings choose whether to include the
// time to leave for the airport and the price.
import { arrival, departure, doorToDoor, minutesBetween, optionCost, sortByDeparture, splitDirections } from "./model.js";
import { costText, formatDate, formatDuration, formatTime } from "./format.js";

export function itineraryText(option, settings) {
  const legs = sortByDeparture(option.itineraries.flatMap((it) => it.legs));
  const days = splitDirections(legs).map((direction) => directionText(direction, settings));
  const cost = optionCost(option.itineraries);
  const price = settings.itineraryPrice && cost.unpriced < cost.count ? `Price: ${costText(cost, settings.currency)}` : "";
  return [...days, price].filter(Boolean).join("\n\n");
}

function directionText(direction, settings) {
  let shownDate = formatDate(departure(direction[0]));

  // Adds the date to a time on a different date from the one before it.
  const when = (dateTime) => {
    const date = formatDate(dateTime);
    const text = date === shownDate ? formatTime(dateTime) : `${formatTime(dateTime)} (${date})`;
    shownDate = date;
    return text;
  };

  const lines = [shownDate];
  if (settings.itineraryLeaveTime) {
    lines.push(`Leave for ${direction[0].from} at ${when(doorToDoor(direction, settings).start)}`);
  }
  direction.forEach((leg, i) => {
    const previous = direction[i - 1];
    if (previous) {
      const layover = minutesBetween(arrival(previous), departure(leg));
      lines.push(`${formatDuration(layover)} layover in ${previous.to}`);
    }
    const carrier = [leg.airline, leg.flightNumber].filter(Boolean).join(" ");
    if (carrier) lines.push(carrier);
    lines.push(`${leg.from} ${when(departure(leg))} → ${leg.to} ${when(arrival(leg))}`);
  });
  return lines.join("\n");
}
