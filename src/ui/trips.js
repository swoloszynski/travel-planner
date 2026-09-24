// Choosing, adding, renaming and deleting trips.
import { state, commit, onChange } from "../app.js";
import { activeTrip, addTrip, deleteTrip } from "../state.js";
import { goToTripStart } from "../calendar.js";
import { html } from "../html.js";
import { on } from "./dom.js";
import { askText, confirmDelete } from "./ask.js";

const section = document.getElementById("trip");
const picker = document.getElementById("trip-picker");
const startDate = document.getElementById("trip-start");

onChange(() => {
  picker.innerHTML = html`${state.trips.map((trip) => html`<option value="${trip.id}">${trip.name}</option>`)}`;
  picker.value = state.activeTripId;
  startDate.value = activeTrip(state).startDate;
});

picker.addEventListener("change", () => {
  commit((s) => (s.activeTripId = picker.value));
  goToTripStart();
});

startDate.addEventListener("change", () => {
  commit((s) => (activeTrip(s).startDate = startDate.value));
  goToTripStart();
});

const actions = {
  async "new-trip"() {
    const name = await askText("Name the new trip", "New trip");
    if (!name) return;
    commit((s) => addTrip(s, name));
    goToTripStart();
  },

  async "rename-trip"() {
    const name = await askText("Rename this trip", activeTrip(state).name);
    if (name) commit((s) => (activeTrip(s).name = name));
  },

  async "delete-trip"() {
    const trip = activeTrip(state);
    if (!(await confirmDelete(`Delete ${trip.name}?`, "This deletes all its options and flights."))) return;
    commit((s) => deleteTrip(s, trip.id));
    goToTripStart();
  },
};

on(section, "click", "[data-action]", (button) => actions[button.dataset.action]());
