import { test, assertEqual } from "./runner.js";
import { flight } from "./helpers.js";
import { optionEvents } from "../src/events.js";

const settings = { minutesToAirport: 45, minutesAtAirport: 120, minutesFromAirport: 30 };

// Each event as [type, title, start, end], with times in New York.
function summarize(events) {
  const time = (dateTime) => dateTime.setZone("America/New_York").toFormat("MMM d HH:mm");
  return events.map((e) => [e.type, e.title, time(e.start), time(e.end)]);
}

const toDenver = flight("LGA 2026-10-08 07:15", "DEN 2026-10-08 09:05", { airline: "United", flightNumber: "UA 1432" });
const denverToSfo = flight("DEN 2026-10-08 10:15", "SFO 2026-10-08 11:45", { airline: "United", flightNumber: "UA 588" });

test("optionEvents covers door to door for a connecting trip", () => {
  const option = { itineraries: [{ legs: [denverToSfo, toDenver] }] };
  assertEqual(summarize(optionEvents(option, settings)), [
    ["transit", "Travel to LGA", "Oct 8 04:30", "Oct 8 05:15"],
    ["airport", "At LGA", "Oct 8 05:15", "Oct 8 07:15"],
    ["flight", "United UA 1432: LGA 7:15am → DEN 9:05am", "Oct 8 07:15", "Oct 8 11:05"],
    ["layover", "Layover in DEN (1h 10m)", "Oct 8 11:05", "Oct 8 12:15"],
    ["flight", "United UA 588: DEN 10:15am → SFO 11:45am", "Oct 8 12:15", "Oct 8 14:45"],
    ["transit", "Travel from SFO", "Oct 8 14:45", "Oct 8 15:15"],
  ]);
});

test("optionEvents shows a connection between separate bookings as a layover", () => {
  const option = { itineraries: [{ legs: [toDenver] }, { legs: [denverToSfo] }] };
  const types = optionEvents(option, settings).map((e) => e.type);
  assertEqual(types, ["transit", "airport", "flight", "layover", "flight", "transit"]);
});

test("optionEvents leaves out airport time set to zero", () => {
  const option = { itineraries: [{ legs: [toDenver] }] };
  const none = { minutesToAirport: 0, minutesAtAirport: 0, minutesFromAirport: 0 };
  assertEqual(optionEvents(option, none).map((e) => e.type), ["flight"]);
});
