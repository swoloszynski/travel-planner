// The week calendar. FullCalendar is loaded as a plain script in
// index.html, since its module build expects a bundler.
import { DateTime } from "luxon";
import { activeTrip } from "./state.js";
import { sortByDeparture } from "./model.js";
import { optionEvents } from "./events.js";
import { sleepWindows } from "./sleep.js";

export function createCalendar(element, getState) {
  const calendar = new FullCalendar.Calendar(element, {
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
  });
  calendar.addEventSource({ id: "flights", events: (info, success) => success(flightEvents(getState())) });
  calendar.addEventSource({ id: "sleep", events: (info, success) => success(sleepEvents(info, getState().settings)) });
  applySettings(calendar, getState().settings);
  calendar.render();
  return calendar;
}

export function applySettings(calendar, settings) {
  const { daysToShow, weekStart, displayTz } = settings;
  const shown = Array.from({ length: daysToShow }, (_, i) => (weekStart + i) % 7);
  calendar.setOption("timeZone", displayTz);
  calendar.setOption("firstDay", weekStart);
  calendar.setOption("hiddenDays", [0, 1, 2, 3, 4, 5, 6].filter((day) => !shown.includes(day)));
}

export function refreshCalendar(calendar) {
  calendar.getEventSourceById("flights").refetch();
  calendar.getEventSourceById("sleep").refetch();
}

// Opens on the trip's start date if it has one, otherwise its first
// flight, otherwise today.
export function goToTripStart(calendar, trip) {
  const legs = trip.options.flatMap((o) => o.itineraries.flatMap((it) => it.legs));
  const date = trip.startDate || sortByDeparture(legs)[0]?.departs.slice(0, 10);
  if (date) calendar.gotoDate(date);
  else calendar.today();
}

// Times are moved into the display timezone before FullCalendar sees them.
// Given times in several zones, FullCalendar can draw a flight as if both
// ends were in the same zone, making it look shorter or longer than it is.
function toDisplay(dateTime, settings) {
  return dateTime.setZone(settings.displayTz).toISO();
}

function flightEvents(state) {
  const { settings } = state;
  return activeTrip(state)
    .options.filter((option) => option.visible)
    .flatMap((option) =>
      optionEvents(option, settings).map((event) => ({
        title: event.title,
        start: toDisplay(event.start, settings),
        end: toDisplay(event.end, settings),
        color: option.color,
        classNames: [`event-${event.type}`],
      }))
    );
}

function sleepEvents(info, settings) {
  // FullCalendar's range is off by the display zone's offset, so pad a day
  // each side.
  const from = DateTime.fromJSDate(info.start).minus({ days: 1 });
  const to = DateTime.fromJSDate(info.end).plus({ days: 1 });
  return sleepWindows(from, to, settings).map((night) => ({
    start: toDisplay(night.start, settings),
    end: toDisplay(night.end, settings),
    display: "background",
    classNames: ["sleep"],
  }));
}
