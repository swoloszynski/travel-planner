// Editing one flight in place, in the right-hand panel.
import { state, commit, render } from "../app.js";
import { activeTrip, findLeg } from "../state.js";
import { html } from "../html.js";
import { on } from "./dom.js";
import { checkFlights, cleaned, copyLeg, flightFields, trackFlightFields } from "./flight-fields.js";

const detail = document.getElementById("option-detail");

// The flight being edited, or null. Not saved.
let draft = null;

export function editLeg(legId) {
  draft = { legId, legs: [copyLeg(findLeg(activeTrip(state), legId).leg)], focus: true };
  render();
}

// The form in place of this flight, if it's the one being edited.
export function legEditor(legId) {
  if (draft?.legId !== legId) return null;
  return html`
    <form class="flight-editor" data-flights data-leg-editor>
      ${flightFields(draft.legs[0], 0, false)}
      <div class="actions">
        <button class="small">Save</button>
        <button type="button" class="secondary outline small" data-cancel-edit>Cancel</button>
      </div>
    </form>`;
}

// Call after drawing the panel.
export function legEditorDrawn() {
  const form = detail.querySelector("[data-leg-editor]");
  if (!form) return;
  checkFlights(form, draft.legs);
  if (draft.focus) {
    draft.focus = false;
    form.querySelector("input").focus();
  }
}

function stop() {
  draft = null;
  render();
}

on(detail, "click", "[data-cancel-edit]", stop);

on(detail, "keydown", "[data-leg-editor]", (form, event) => {
  if (event.key === "Escape") stop();
});

on(detail, "submit", "[data-leg-editor]", (form, event) => {
  event.preventDefault();
  const changes = cleaned(draft.legs[0]);
  const { legId } = draft;
  draft = null;
  commit((s) => Object.assign(findLeg(activeTrip(s), legId).leg, changes));
});

trackFlightFields(detail, () => draft.legs);
