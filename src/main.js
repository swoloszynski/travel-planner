import { loadState } from "./storage.js";
import { activeTrip } from "./state.js";
import { createCalendar, goToTripStart } from "./calendar.js";

let state = loadState();

const calendar = createCalendar(document.getElementById("calendar"), () => state);
goToTripStart(calendar, activeTrip(state));
