// Choosing, adding, renaming and deleting trips.
import { state, commit, onChange, render } from "../app.js";
import { activeTrip, addTrip, deleteTrip } from "../state.js";
import { goToTripStart } from "../calendar.js";
import { html } from "../html.js";
import { on, redraw } from "./dom.js";
import { confirmDelete } from "./ask.js";

const section = document.getElementById("trip");
const picker = document.getElementById("trip-picker");
const startDate = document.getElementById("trip-start");
const tripName = document.getElementById("trip-name");

// Whether the picker is showing a text field to rename the trip. Not saved.
let renaming = false;

onChange(() => {
  const trip = activeTrip(state);
  tripName.textContent = trip.name;
  startDate.value = trip.startDate;
  redraw(
    picker,
    renaming
      ? html`<div role="group">
          <input data-action="trip-name" value="${trip.name}" aria-label="Trip name">
          <button data-action="save-name">Save</button>
          <button class="secondary outline" data-action="cancel-rename">Cancel</button>
        </div>`
      : html`<select data-action="pick-trip" aria-label="Trip">
          ${state.trips.map(
            (t) => html`<option value="${t.id}" ${t.id === trip.id ? html`selected` : ""}>${t.name}</option>`
          )}
        </select>`
  );
});

function startRenaming() {
  renaming = true;
  render();
  picker.querySelector("input").select();
}

function saveName() {
  const name = picker.querySelector("input").value.trim();
  renaming = false;
  if (name) commit((s) => (activeTrip(s).name = name));
  else render();
}

function cancelRename() {
  renaming = false;
  render();
}

startDate.addEventListener("change", () => {
  commit((s) => (activeTrip(s).startDate = startDate.value));
  goToTripStart();
});

on(picker, "change", '[data-action="pick-trip"]', (select) => {
  commit((s) => (s.activeTripId = select.value));
  goToTripStart();
});

on(picker, "keydown", '[data-action="trip-name"]', (input, event) => {
  if (event.key === "Enter") saveName();
  if (event.key === "Escape") cancelRename();
});

const actions = {
  "save-name": saveName,
  "cancel-rename": cancelRename,
  "rename-trip": startRenaming,

  // Starts with a placeholder name, ready to type over.
  "new-trip"() {
    commit((s) => addTrip(s, "New trip"));
    goToTripStart();
    startRenaming();
  },

  async "delete-trip"() {
    const trip = activeTrip(state);
    if (!(await confirmDelete(`Delete ${trip.name}?`, "This deletes all its options and flights."))) return;
    commit((s) => deleteTrip(s, trip.id));
    goToTripStart();
  },
};

on(section, "click", "button[data-action]", (button) => actions[button.dataset.action]());
