import { test, assertEqual } from "./runner.js";
import { flight } from "./helpers.js";
import { describeOption } from "../src/describe.js";

const settings = {
  minutesToAirport: 0,
  minutesAtAirport: 0,
  minutesFromAirport: 0,
  sleepEnabled: true,
  sleepStart: "23:00",
  sleepEnd: "07:00",
  sleepTz: "America/New_York",
};

const toDenver = flight("LGA 2026-10-08 07:15", "DEN 2026-10-08 09:05");
const denverToSfo = flight("DEN 2026-10-08 10:15", "SFO 2026-10-08 11:45");
const redEyeHome = flight("SFO 2026-10-14 22:30", "JFK 2026-10-15 06:45");

const option = {
  id: "a",
  name: "Option A",
  itineraries: [
    { id: "home", price: null, legs: [redEyeHome] },
    { id: "second", price: 90, legs: [denverToSfo] },
    { id: "first", price: 120, legs: [toDenver] },
  ],
};

test("describeOption numbers itineraries in travel order", () => {
  const described = describeOption(option, settings);
  assertEqual(
    described.itineraries.map((it) => [it.number, it.id, it.route]),
    [
      [1, "first", "LGA → DEN"],
      [2, "second", "DEN → SFO"],
      [3, "home", "SFO → JFK"],
    ]
  );
});

test("describeOption adds up cost, transfers and sleep", () => {
  const described = describeOption(option, settings);
  assertEqual(described.cost, { total: 210, unpriced: 1, count: 3 });
  assertEqual(described.transfers, [{ itineraryId: "second", airport: "DEN", minutes: 70 }]);
  assertEqual(described.itineraries[1].transfer, described.transfers[0]);
  assertEqual(described.sleepMinutes, 5 * 60 + 15);
});
