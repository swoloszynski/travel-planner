import { test, assertEqual } from "./runner.js";
import { flight } from "./helpers.js";
import { googleFlightsSearches } from "../src/google-flights.js";

// The typed search in each link.
const queries = (searches) =>
  searches.map(({ label, url }) => [label, decodeURIComponent(url.split("?q=")[1])]);

const outbound = flight("JFK 2026-10-05 06:00", "LAX 2026-10-05 09:32");
const back = flight("LAX 2026-10-12 13:00", "JFK 2026-10-12 21:30");

test("a one-way booking searches from its first airport to its last", () => {
  const toDenver = flight("LGA 2026-10-08 07:15", "DEN 2026-10-08 09:05");
  const toSfo = flight("DEN 2026-10-08 10:15", "SFO 2026-10-08 11:45");
  assertEqual(queries(googleFlightsSearches([toDenver, toSfo])), [
    ["Find in Google Flights", "Flights from LGA to SFO on 2026-10-08"],
  ]);
});

test("a round trip searches with its return date", () => {
  assertEqual(queries(googleFlightsSearches([outbound, back])), [
    ["Find in Google Flights", "Flights from JFK to LAX on 2026-10-05 returning 2026-10-12"],
  ]);
});

test("a multi-city booking gets a search for each direction", () => {
  const onward = flight("LAX 2026-10-12 13:00", "SEA 2026-10-12 15:45");
  assertEqual(queries(googleFlightsSearches([outbound, onward])), [
    ["Find JFK → LAX", "Flights from JFK to LAX on 2026-10-05"],
    ["Find LAX → SEA", "Flights from LAX to SEA on 2026-10-12"],
  ]);
});
