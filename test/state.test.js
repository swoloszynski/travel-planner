import { test, assertEqual } from "./runner.js";
import { flight } from "./helpers.js";
import {
  VERSION,
  createState,
  restoreState,
  activeTrip,
  addTrip,
  deleteTrip,
  addOption,
  deleteOption,
  addItinerary,
  mergeItineraries,
  deleteLeg,
  findLeg,
} from "../src/state.js";

const outbound = flight("JFK 2026-10-05 06:00", "LAX 2026-10-05 09:32");
const back = flight("LAX 2026-10-12 13:00", "JFK 2026-10-12 21:30");

test("a new state has one trip with one option", () => {
  const trip = activeTrip(createState());
  assertEqual(trip.name, "My trip");
  assertEqual(trip.options.map((o) => o.name), ["Option A"]);
});

test("addOption names and colors options in order", () => {
  const trip = activeTrip(createState());
  addOption(trip);
  addOption(trip, "Via Denver");
  assertEqual(trip.options.map((o) => o.name), ["Option A", "Option B", "Via Denver"]);
  assertEqual(new Set(trip.options.map((o) => o.color)).size, 3);
});

test("deleting the last option leaves a fresh one", () => {
  const trip = activeTrip(createState());
  deleteOption(trip, trip.options[0].id);
  assertEqual(trip.options.map((o) => o.name), ["Option A"]);
});

test("deleting the active trip switches to another", () => {
  const state = createState();
  const first = activeTrip(state);
  const second = addTrip(state, "Tokyo");
  assertEqual(activeTrip(state), second);
  deleteTrip(state, second.id);
  assertEqual(activeTrip(state), first);
});

test("deleting the last trip leaves a fresh one", () => {
  const state = createState();
  deleteTrip(state, state.activeTripId);
  assertEqual(state.trips.length, 1);
  assertEqual(activeTrip(state).name, "My trip");
});

test("addItinerary gives each flight an id", () => {
  const option = activeTrip(createState()).options[0];
  const itinerary = addItinerary(option, [outbound], 289);
  assertEqual(itinerary.price, 289);
  assertEqual(typeof itinerary.legs[0].id, "string");
});

test("mergeItineraries moves flights into one booking and adds prices", () => {
  const option = activeTrip(createState()).options[0];
  const out = addItinerary(option, [outbound], 200);
  const home = addItinerary(option, [back], 150);
  mergeItineraries(option, home.id, out.id);
  assertEqual(option.itineraries.length, 1);
  assertEqual(out.legs.length, 2);
  assertEqual(out.price, 350);
});

test("mergeItineraries keeps no price when neither had one", () => {
  const option = activeTrip(createState()).options[0];
  const out = addItinerary(option, [outbound]);
  const home = addItinerary(option, [back]);
  mergeItineraries(option, home.id, out.id);
  assertEqual(out.price, null);
});

test("deleting an itinerary's last flight deletes the itinerary", () => {
  const trip = activeTrip(createState());
  const option = trip.options[0];
  const itinerary = addItinerary(option, [outbound, back]);
  deleteLeg(trip, itinerary.legs[0].id);
  assertEqual(option.itineraries.length, 1);
  deleteLeg(trip, itinerary.legs[0].id);
  assertEqual(option.itineraries.length, 0);
});

test("findLeg returns the leg with its itinerary and option", () => {
  const trip = activeTrip(createState());
  const option = trip.options[0];
  const itinerary = addItinerary(option, [outbound]);
  const found = findLeg(trip, itinerary.legs[0].id);
  assertEqual([found.option.id, found.itinerary.id, found.leg.from], [option.id, itinerary.id, "JFK"]);
});

test("restoreState fills in settings added since the data was saved", () => {
  const saved = createState();
  delete saved.settings.currency;
  assertEqual(restoreState(saved).settings.currency, "USD");
});

test("restoreState rejects data that isn't from this version", () => {
  assertEqual(restoreState({ version: VERSION + 1, trips: [] }), null);
  assertEqual(restoreState({ flights: [] }), null);
});
