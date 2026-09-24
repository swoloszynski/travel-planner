// The saved data, and the edits the page makes to it.
//
// state = {
//   version, settings, activeTripId,
//   trips: [{ id, name, startDate,
//     options: [{ id, name, color, visible,
//       itineraries: [{ id, price,
//         legs: [{ id, airline, flightNumber, from, fromTz, departs, to, toTz, arrives }] }] }] }]
// }
//
// A leg's `departs` and `arrives` are local times at its airports, like
// "2026-10-05T06:00", and `fromTz` and `toTz` are those airports' zones.

export const VERSION = 1;

export const OPTION_COLORS = ["#3788d8", "#d97706", "#16a34a", "#9333ea", "#dc2626", "#0891b2", "#db2777"];

const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function defaultSettings() {
  return {
    displayTz: localZone,
    minutesToAirport: 45,
    minutesAtAirport: 120,
    minutesFromAirport: 30,
    daysToShow: 7,
    weekStart: 0,
    extraTimezones: [],
    currency: "USD",
    sleepEnabled: true,
    sleepStart: "23:00",
    sleepEnd: "07:00",
    sleepTz: localZone,
    // Google sign-in only works from the origins listed on this client ID
    // (http://localhost:5173), which is why the dev server's port is fixed.
    googleClientId: "286045286235-on4jck7a2b0nl5f9t55rbt6165o4ddsd.apps.googleusercontent.com",
    googleCalendarIds: ["primary"],
  };
}

export function createState() {
  const trip = newTrip("My trip");
  return { version: VERSION, settings: defaultSettings(), activeTripId: trip.id, trips: [trip] };
}

// Checks saved or imported data and fills in anything added since it was
// saved. Returns null if it isn't data from this version of the app.
export function restoreState(saved) {
  if (saved?.version !== VERSION || !saved.trips?.length) return null;
  const activeTripId = saved.trips.some((t) => t.id === saved.activeTripId) ? saved.activeTripId : saved.trips[0].id;
  return { ...saved, settings: { ...defaultSettings(), ...saved.settings }, activeTripId };
}

function newId() {
  return crypto.randomUUID();
}

// Trips

function newTrip(name) {
  const trip = { id: newId(), name, startDate: "", options: [] };
  addOption(trip);
  return trip;
}

export function activeTrip(state) {
  return state.trips.find((t) => t.id === state.activeTripId);
}

export function addTrip(state, name) {
  const trip = newTrip(name);
  state.trips.push(trip);
  state.activeTripId = trip.id;
  return trip;
}

export function deleteTrip(state, tripId) {
  state.trips = state.trips.filter((t) => t.id !== tripId);
  if (!state.trips.length) state.trips.push(newTrip("My trip"));
  if (!activeTrip(state)) state.activeTripId = state.trips[0].id;
}

// Options

export function nextOptionName(trip) {
  return `Option ${String.fromCharCode(65 + trip.options.length)}`;
}

export function addOption(trip, name = nextOptionName(trip)) {
  const color = OPTION_COLORS[trip.options.length % OPTION_COLORS.length];
  const option = { id: newId(), name, color, visible: true, itineraries: [] };
  trip.options.push(option);
  return option;
}

// A trip always keeps at least one option to add flights to.
export function deleteOption(trip, optionId) {
  trip.options = trip.options.filter((o) => o.id !== optionId);
  if (!trip.options.length) addOption(trip);
}

// Itineraries

export function addItinerary(option, legs, price = null) {
  const itinerary = { id: newId(), price, legs: [] };
  legs.forEach((leg) => addLeg(itinerary, leg));
  option.itineraries.push(itinerary);
  return itinerary;
}

export function deleteItinerary(option, itineraryId) {
  option.itineraries = option.itineraries.filter((it) => it.id !== itineraryId);
}

export function findItinerary(trip, itineraryId) {
  for (const option of trip.options) {
    const itinerary = option.itineraries.find((it) => it.id === itineraryId);
    if (itinerary) return { option, itinerary };
  }
  return null;
}

// Legs

export function addLeg(itinerary, leg) {
  itinerary.legs.push({ ...leg, id: newId() });
}

export function findLeg(trip, legId) {
  for (const option of trip.options) {
    for (const itinerary of option.itineraries) {
      const leg = itinerary.legs.find((l) => l.id === legId);
      if (leg) return { option, itinerary, leg };
    }
  }
  return null;
}

// An itinerary with no flights left is deleted too.
export function deleteLeg(trip, legId) {
  const { option, itinerary } = findLeg(trip, legId);
  itinerary.legs = itinerary.legs.filter((l) => l.id !== legId);
  if (!itinerary.legs.length) deleteItinerary(option, itinerary.id);
}
