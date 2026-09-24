// Everything the page shows about an option, worked out in one place so
// the rendering code only has to read it.
import {
  itineraryKind,
  optionCost,
  routeText,
  selfTransfers,
  sortByDeparture,
  sortItineraries,
  splitDirections,
} from "./model.js";
import { sleepMinutes } from "./sleep.js";

export function describeOption(option, settings) {
  const itineraries = sortItineraries(option.itineraries).map((it) => ({ ...it, legs: sortByDeparture(it.legs) }));
  const transfers = selfTransfers(itineraries);

  const described = itineraries.map((it, i) => ({
    ...it,
    number: i + 1,
    kind: itineraryKind(it.legs),
    route: routeText(it.legs),
    directions: splitDirections(it.legs),
    transfer: transfers.find((t) => t.itineraryId === it.id),
    sleepMinutes: sleepMinutes(it.legs, settings),
  }));

  return {
    ...option,
    itineraries: described,
    cost: optionCost(itineraries),
    transfers,
    sleepMinutes: described.reduce((sum, it) => sum + it.sleepMinutes, 0),
  };
}
