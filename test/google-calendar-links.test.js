import { test, assertEqual } from "./runner.js";
import { flight } from "./helpers.js";
import { googleCalendarLinks } from "../src/google-calendar-links.js";

const settings = { minutesToAirport: 45, minutesAtAirport: 120, minutesFromAirport: 30 };

const option = {
  itineraries: [
    { legs: [flight("LGA 2026-10-08 07:15", "DEN 2026-10-08 09:05", { airline: "United", flightNumber: "UA 12" })] },
    { legs: [flight("DEN 2026-10-08 10:15", "SFO 2026-10-08 11:45")] },
  ],
};

test("googleCalendarLinks gives one link per flight by default", () => {
  assertEqual(
    googleCalendarLinks(option, settings, false).map((link) => link.label),
    ["Thu, Oct 8: ✈️ LGA → DEN", "Thu, Oct 8: ✈️ DEN → SFO"]
  );
});

test("googleCalendarLinks puts the route, UTC times and carrier in the link", () => {
  const [withCarrier, withoutCarrier] = googleCalendarLinks(option, settings, false);
  const start = "https://calendar.google.com/calendar/render?action=TEMPLATE";
  assertEqual(
    withCarrier.url,
    `${start}&text=%E2%9C%88%EF%B8%8F%20LGA%20%E2%86%92%20DEN&dates=20261008T111500Z/20261008T150500Z&details=United%20UA%2012`
  );
  assertEqual(
    withoutCarrier.url,
    `${start}&text=%E2%9C%88%EF%B8%8F%20DEN%20%E2%86%92%20SFO&dates=20261008T161500Z/20261008T184500Z`
  );
});

test("googleCalendarLinks can include every travel event", () => {
  const titles = googleCalendarLinks(option, settings, true).map((link) => link.label.split(": ").slice(1).join(": "));
  assertEqual(titles, [
    "Transit to LGA",
    "At LGA airport",
    "✈️ LGA → DEN",
    "Layover in DEN (1h 10m)",
    "✈️ DEN → SFO",
    "Transit from SFO",
  ]);
});
