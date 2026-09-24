// The week calendar. FullCalendar is loaded as a plain script in
// index.html, since its module build expects a bundler.
import { DateTime } from "luxon";
import { state, onChange } from "./app.js";
import { activeTrip } from "./state.js";
import { sortByDeparture } from "./model.js";
import { optionEvents } from "./events.js";
import { sleepWindows } from "./sleep.js";
import { html } from "./html.js";

export const calendar = new FullCalendar.Calendar(document.getElementById("calendar"), {
  initialView: "timeGridWeek",
  headerToolbar: {
    left: "prev,next today",
    center: "title",
    right: "timeGridDay,timeGridWeek,dayGridMonth",
  },
  height: "auto",
  nowIndicator: true,
  // Each day runs from 4am to 4am, so a late-night flight stays in the
  // evening it belongs to instead of spilling into the next column.
  slotMinTime: "04:00:00",
  slotMaxTime: "28:00:00",
  nextDayThreshold: "04:00:00",
  eventTimeFormat: { hour: "numeric", minute: "2-digit" },
  slotLabelContent: (slot) => ({ html: String(slotLabel(slot)) }),
});
calendar.addEventSource({ id: "flights", events: (info, success) => success(flightEvents()) });
calendar.addEventSource({ id: "sleep", events: (info, success) => success(sleepEvents(info)) });
applySettings();
calendar.render();
goToTripStart();

onChange(() => {
  calendar.getEventSourceById("flights").refetch();
  calendar.getEventSourceById("sleep").refetch();
});

export function applySettings() {
  const { daysToShow, weekStart, displayTz } = state.settings;
  const shown = Array.from({ length: daysToShow }, (_, i) => (weekStart + i) % 7);
  calendar.setOption("timeZone", displayTz);
  calendar.setOption("firstDay", weekStart);
  calendar.setOption("hiddenDays", [0, 1, 2, 3, 4, 5, 6].filter((day) => !shown.includes(day)));
}

// Opens on the trip's start date if it has one, otherwise its first
// flight, otherwise today.
export function goToTripStart() {
  const trip = activeTrip(state);
  const legs = trip.options.flatMap((o) => o.itineraries.flatMap((it) => it.legs));
  const date = trip.startDate || sortByDeparture(legs)[0]?.departs.slice(0, 10);
  if (date) calendar.gotoDate(date);
  else calendar.today();
}

// Times are moved into the display timezone before FullCalendar sees them.
// Given times in several zones, FullCalendar can draw a flight as if both
// ends were in the same zone, making it look shorter or longer than it is.
export function toDisplay(dateTime) {
  return dateTime.setZone(state.settings.displayTz).toISO();
}

// The time in each chosen zone, so "9:00 AM EDT" and "6:00 AM PDT" sit
// side by side down the calendar's left edge.
//
// FullCalendar gives the slot's clock time in the display zone, stored in
// the Date's UTC fields on Jan 1, 1970 (Jan 2 for slots past midnight).
// Moving that clock time onto the week in view gets the right daylight
// saving offsets.
function slotLabel({ date, view }) {
  const { displayTz, extraTimezones } = state.settings;
  const weekStart = DateTime.fromJSDate(view.currentStart, { zone: "utc" });
  const instant = DateTime.fromObject(
    {
      year: weekStart.year,
      month: weekStart.month,
      day: weekStart.day,
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
    },
    { zone: displayTz }
  ).plus({ days: date.getUTCDate() - 1 });

  const zones = [...new Set([displayTz, ...extraTimezones])];
  return html`${zones.map((zone) => {
    const time = instant.setZone(zone);
    return html`<div class="slot-time">${time.toFormat("h:mm a")} ${time.offsetNameShort}</div>`;
  })}`;
}

function flightEvents() {
  return activeTrip(state)
    .options.filter((option) => option.visible)
    .flatMap((option) =>
      optionEvents(option, state.settings).map((event) => ({
        title: event.title,
        start: toDisplay(event.start),
        end: toDisplay(event.end),
        color: option.color,
        classNames: [`event-${event.type}`],
      }))
    );
}

function sleepEvents(info) {
  // FullCalendar's range is off by the display zone's offset, so pad a day
  // each side.
  const from = DateTime.fromJSDate(info.start).minus({ days: 1 });
  const to = DateTime.fromJSDate(info.end).plus({ days: 1 });
  return sleepWindows(from, to, state.settings).map((night) => ({
    start: toDisplay(night.start),
    end: toDisplay(night.end),
    display: "background",
    classNames: ["sleep"],
  }));
}
