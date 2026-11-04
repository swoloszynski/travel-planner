// Choosing, adding, renaming and deleting trips.
import { state, commit, onChange, render } from "../app.js";
import { activeTrip, addTrip, deleteTrip } from "../state.js";
import { goToTripStart } from "../calendar.js";
import { html } from "../html.js";
import { confirmed, on, redraw } from "./dom.js";

const section = document.getElementById("trip");
const picker = document.getElementById("trip-picker");
const startDate = document.getElementById("trip-start");
const daysToShow = document.getElementById("trip-days");
const weekStart = document.getElementById("trip-week-start");
const tripName = document.getElementById("trip-name");

// Whether the picker is showing a text field to rename the trip. Not saved.
let renaming = false;

onChange(() => {
  const trip = activeTrip(state);
  tripName.textContent = trip.name;
  startDate.value = trip.startDate;
  daysToShow.value = trip.daysToShow;
  weekStart.value = trip.weekStart;
  section.classList.toggle("renaming", renaming);
  redraw(
    picker,
    renaming
      ? html`<div role="group">
          <input data-action="trip-name" value="${trip.name}" aria-label="Trip name">
          <button class="small" data-action="save-name">Save</button>
          <button class="secondary outline small" data-action="cancel-rename">Cancel</button>
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

// How the calendar shows this trip: 1 to 7 days, from which day of the week.
daysToShow.addEventListener("change", () => {
  const days = Math.min(7, Math.max(1, Math.round(Number(daysToShow.value)) || 7));
  commit((s) => (activeTrip(s).daysToShow = days));
});

weekStart.addEventListener("change", () => {
  commit((s) => (activeTrip(s).weekStart = Number(weekStart.value)));
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

  "delete-trip"(button) {
    if (!confirmed(button)) return;
    commit((s) => deleteTrip(s, s.activeTripId));
    goToTripStart();
  },
};

on(section, "click", "button[data-action]", (button) => actions[button.dataset.action](button));
