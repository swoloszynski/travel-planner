// Links that open Google Calendar's new-event page with an event filled in,
// to save with one click. They need no sign-in here, only being signed in to
// Google in the browser. Each link holds one event.
import { optionEvents } from "./events.js";
import { formatDate } from "./format.js";

const NEW_EVENT = "https://calendar.google.com/calendar/render?action=TEMPLATE";

// One link per flight, or with `allTravel` one for every block of time on
// the calendar: getting to the airport, waiting there, layovers and getting
// away.
export function googleCalendarLinks(option, settings, allTravel) {
  return optionEvents(option, settings)
    .filter((event) => allTravel || event.type === "flight")
    .map(({ title, start, end, leg }) => {
      // A flight's airline and flight number go in the description.
      const details = leg ? [leg.airline, leg.flightNumber].filter(Boolean).join(" ") : "";
      const about = details ? `&details=${encodeURIComponent(details)}` : "";
      return {
        label: `${formatDate(start)}: ${title}`,
        url: `${NEW_EVENT}&text=${encodeURIComponent(title)}&dates=${utc(start)}/${utc(end)}${about}`,
      };
    });
}

function utc(dateTime) {
  return dateTime.toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
}
