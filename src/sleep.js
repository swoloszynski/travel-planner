// The traveler's usual sleep hours, kept in the timezone their body clock
// is on so they stay fixed while the trip crosses zones.
import { DateTime } from "luxon";
import { doorToDoor, minutesBetween, splitDirections } from "./model.js";

function clock(time) {
  const [hour, minute] = time.split(":").map(Number);
  return { hour, minute };
}

// Sleep periods that overlap the time between `from` and `to`.
export function sleepWindows(from, to, settings) {
  const { sleepEnabled, sleepStart, sleepEnd, sleepTz } = settings;
  if (!sleepEnabled) return [];
  const windows = [];
  // Start a day early to catch a night that began before `from`.
  let day = from.setZone(sleepTz).startOf("day").minus({ days: 1 });
  const lastDay = to.setZone(sleepTz).startOf("day");
  while (day <= lastDay) {
    const start = day.set(clock(sleepStart));
    let end = day.set(clock(sleepEnd));
    if (end <= start) end = end.plus({ days: 1 });
    if (end > from && start < to) windows.push({ start, end });
    day = day.plus({ days: 1 });
  }
  return windows;
}

// Minutes of door-to-door travel that fall inside usual sleep hours.
// Takes legs sorted by departure.
export function sleepMinutes(legs, settings) {
  let total = 0;
  for (const direction of splitDirections(legs)) {
    const trip = doorToDoor(direction, settings);
    for (const night of sleepWindows(trip.start, trip.end, settings)) {
      const start = DateTime.max(night.start, trip.start);
      const end = DateTime.min(night.end, trip.end);
      total += minutesBetween(start, end);
    }
  }
  return Math.round(total);
}
