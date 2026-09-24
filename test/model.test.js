import { test, assertEqual } from "./runner.js";
import { flight } from "./helpers.js";
import {
  flightMinutes,
  splitDirections,
  itineraryKind,
  routeText,
  sortItineraries,
  optionCost,
  selfTransfers,
} from "../src/model.js";

const outbound = flight("JFK 2026-10-05 06:00", "LAX 2026-10-05 09:32");
const back = flight("LAX 2026-10-12 13:00", "JFK 2026-10-12 21:30");
const toDenver = flight("LGA 2026-10-08 07:15", "DEN 2026-10-08 09:05");
const denverToSfo = flight("DEN 2026-10-08 10:15", "SFO 2026-10-08 11:45");

test("flight time accounts for each airport's timezone", () => {
  assertEqual(flightMinutes(outbound), 6 * 60 + 32);
});

test("a change of planes within a day is one direction", () => {
  assertEqual(splitDirections([toDenver, denverToSfo]), [[toDenver, denverToSfo]]);
});

test("a stay of a day or more starts a new direction", () => {
  const nextDay = flight("DEN 2026-10-09 09:05", "SFO 2026-10-09 10:35");
  assertEqual(splitDirections([toDenver, nextDay]), [[toDenver], [nextDay]]);
});

test("leaving from a different airport starts a new direction", () => {
  const fromOakland = flight("OAK 2026-10-08 12:00", "SEA 2026-10-08 14:10");
  assertEqual(splitDirections([toDenver, fromOakland]), [[toDenver], [fromOakland]]);
});

test("itineraryKind tells one-way, round trip and multi-city apart", () => {
  const onward = flight("LAX 2026-10-12 13:00", "SEA 2026-10-12 15:45");
  assertEqual(itineraryKind([toDenver, denverToSfo]), "oneway");
  assertEqual(itineraryKind([outbound, back]), "roundtrip");
  assertEqual(itineraryKind([outbound, onward]), "multicity");
});

test("routeText shows a round trip as a pair of airports", () => {
  assertEqual(routeText([outbound, back]), "JFK ⇄ LAX");
});

test("routeText lists where each direction starts and ends", () => {
  const onward = flight("LAX 2026-10-12 13:00", "SEA 2026-10-12 15:45");
  assertEqual(routeText([toDenver, denverToSfo]), "LGA → SFO");
  assertEqual(routeText([outbound, onward]), "JFK → LAX → SEA");
});

const itinerary = (id, price, legs) => ({ id, price, legs });

test("sortItineraries puts itineraries in travel order", () => {
  const later = itinerary("later", null, [back]);
  const earlier = itinerary("earlier", null, [outbound]);
  assertEqual(sortItineraries([later, earlier]).map((it) => it.id), ["earlier", "later"]);
});

test("optionCost adds up prices and counts itineraries without one", () => {
  const itineraries = [itinerary("a", 289, [outbound]), itinerary("b", 150.5, [back]), itinerary("c", null, [toDenver])];
  assertEqual(optionCost(itineraries), { total: 439.5, unpriced: 1, count: 3 });
});

test("selfTransfers finds connections between separate bookings", () => {
  const first = itinerary("first", 120, [toDenver]);
  const second = itinerary("second", 90, [denverToSfo]);
  assertEqual(selfTransfers([first, second]), [{ itineraryId: "second", airport: "DEN", minutes: 70 }]);
});

test("selfTransfers ignores bookings that don't connect", () => {
  assertEqual(selfTransfers([itinerary("out", 200, [outbound]), itinerary("back", 200, [back])]), []);
});
