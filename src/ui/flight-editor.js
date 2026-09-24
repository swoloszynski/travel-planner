// The inline form for adding and editing flights. It opens in one place
// at a time:
//   - at the top of an option, to add a new booking, with a paste box and
//     a price;
//   - inside an itinerary, to add flights to that booking, with a paste box;
//   - in place of one flight, to edit it.
// Pasted text fills in the fields below it, to check before adding.
import { state, commit, render } from "../app.js";
import { activeTrip, addItinerary, addLeg, findItinerary, findLeg } from "../state.js";
import { arrival, departure, sortByDeparture } from "../model.js";
import { parseFlights } from "../parse.js";
import { findAirport } from "../data/airports.js";
import { findTimezone } from "../timezones.js";
import { formatPrice, parsePrice } from "../format.js";
import { html } from "../html.js";
import { on } from "./dom.js";

const FIELDS = ["airline", "flightNumber", "from", "fromTz", "departs", "to", "toTz", "arrives"];
const blankLeg = () => Object.fromEntries(FIELDS.map((name) => [name, ""]));

// What's being edited, or null. Typing updates it, so the form survives
// the page redrawing. Not saved.
let draft = null;

function start(target, id, legs) {
  draft = { target, id, legs, pasted: "", price: "", message: "", focus: true };
  render();
}

export function addBooking(optionId) {
  start("option", optionId, [blankLeg()]);
}

// Starts from where the itinerary's last flight lands.
export function addToItinerary(itineraryId) {
  const { itinerary } = findItinerary(activeTrip(state), itineraryId);
  const last = sortByDeparture(itinerary.legs).at(-1);
  start("itinerary", itineraryId, [{ ...blankLeg(), from: last.to, fromTz: last.toTz }]);
}

export function editLeg(legId) {
  const { leg } = findLeg(activeTrip(state), legId);
  start("leg", legId, [Object.fromEntries(FIELDS.map((name) => [name, leg[name]]))]);
}

// The form, if it's open at this place; otherwise null.
export function editorAt(target, id) {
  if (draft?.target !== target || draft.id !== id) return null;
  const { legs, pasted, price, message } = draft;
  const canPaste = target !== "leg";
  const saveLabel = { option: "Add booking", itinerary: "Add to booking", leg: "Save" }[target];

  return html`
    <form class="flight-editor" data-editor>
      ${canPaste &&
      html`<label>
          Paste from Google Flights
          <textarea rows="4" data-field="pasted"
            placeholder="Mon, Oct 5&#10;Delta&#10;6:00 AM – 9:32 AM&#10;JFK–LAX&#10;$289">${pasted}</textarea>
        </label>
        <button type="button" class="secondary" data-editor-action="fill">Fill in from paste</button>
        ${message && html`<p class="hint" role="status">${message}</p>`}`}
      ${legs.map((leg, row) => legFields(leg, row, legs.length > 1))}
      ${canPaste && html`<p><button type="button" class="link" data-editor-action="add-row">Add another flight</button></p>`}
      ${target === "option" &&
      html`<label>
        Price for this booking
        <input inputmode="decimal" placeholder="342.00" data-field="price" value="${price}">
      </label>`}
      <div class="actions">
        <button>${saveLabel}</button>
        <button type="button" class="secondary outline" data-editor-action="cancel">Cancel</button>
      </div>
    </form>`;
}

function legFields(leg, row, numbered) {
  const input = (field, attributes = html``) =>
    html`<input data-field="${field}" data-row="${row}" value="${leg[field]}" ${attributes}>`;
  return html`
    <fieldset class="flight-fields">
      ${numbered &&
      html`<legend>
        Flight ${row + 1}
        <button type="button" class="link danger" data-editor-action="remove-row" data-row="${row}">Remove</button>
      </legend>`}
      <div class="grid">
        <label>Airline ${input("airline", html`placeholder="Delta"`)}</label>
        <label>Flight number ${input("flightNumber", html`placeholder="DL 123"`)}</label>
      </div>
      <div class="grid">
        <label>From ${input("from", html`list="airports" placeholder="JFK" maxlength="4" required`)}</label>
        <label>Timezone ${input("fromTz", html`list="timezones" placeholder="America/New_York" required`)}</label>
      </div>
      <label>Leaves, local time ${input("departs", html`type="datetime-local" required`)}</label>
      <div class="grid">
        <label>To ${input("to", html`list="airports" placeholder="LAX" maxlength="4" required`)}</label>
        <label>Timezone ${input("toTz", html`list="timezones" placeholder="America/Los_Angeles" required`)}</label>
      </div>
      <label>Lands, local time ${input("arrives", html`type="datetime-local" required`)}</label>
    </fieldset>`;
}

// Call after drawing the page: checks the fields, and focuses the form when
// it has just opened.
export function editorDrawn(root) {
  const form = root.querySelector("[data-editor]");
  if (!form) return;
  form.querySelectorAll("fieldset").forEach((_, row) => check(form, row));
  if (draft.focus) {
    draft.focus = false;
    form.querySelector("textarea, input").focus();
    form.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function check(form, row) {
  const field = (name) => form.querySelector(`[data-field="${name}"][data-row="${row}"]`);
  for (const name of ["fromTz", "toTz"]) {
    const unknown = field(name).value && !findTimezone(field(name).value);
    field(name).setCustomValidity(unknown ? "Unknown timezone. Try a city, like Chicago." : "");
  }
  const leg = cleaned(draft.legs[row]);
  const complete = leg.departs && leg.arrives && leg.fromTz && leg.toTz;
  const backwards = complete && arrival(leg) <= departure(leg);
  field("arrives").setCustomValidity(backwards ? "The flight has to land after it leaves." : "");
}

function cleaned(leg) {
  const trimmed = Object.fromEntries(FIELDS.map((name) => [name, leg[name].trim()]));
  return { ...trimmed, fromTz: findTimezone(trimmed.fromTz) ?? "", toTz: findTimezone(trimmed.toTz) ?? "" };
}

function fillFromPaste() {
  const { legs, price } = parseFlights(draft.pasted);
  if (!legs.length) {
    draft.message = "No flights found. Check that the text includes dates, times and airport codes.";
    return;
  }
  draft.legs = legs;
  if (draft.target === "option" && price !== null) draft.price = String(price);

  const unknown = [...new Set(legs.flatMap((leg) => [!leg.fromTz && leg.from, !leg.toTz && leg.to]).filter(Boolean))];
  const found = legs.length === 1 ? "1 flight" : `${legs.length} flights`;
  const priced = draft.target === "option" && price !== null ? ` at ${formatPrice(price, state.settings.currency)}` : "";
  draft.message =
    `Filled in ${found}${priced}. Check them below, then add.` +
    (unknown.length ? ` Enter the timezone for ${unknown.join(" and ")}.` : "");
}

function save() {
  const { target, id, price } = draft;
  const legs = draft.legs.map(cleaned);
  draft = null;
  commit((s) => {
    const trip = activeTrip(s);
    if (target === "option") {
      const option = trip.options.find((o) => o.id === id);
      addItinerary(option, legs, parsePrice(price));
    } else if (target === "itinerary") {
      const { itinerary } = findItinerary(trip, id);
      legs.forEach((leg) => addLeg(itinerary, leg));
    } else {
      Object.assign(findLeg(trip, id).leg, legs[0]);
    }
  });
}

const actions = {
  fill() {
    fillFromPaste();
    render();
  },
  "add-row"() {
    const previous = draft.legs.at(-1);
    draft.legs.push({ ...blankLeg(), from: previous.to, fromTz: previous.toTz });
    render();
  },
  "remove-row"(button) {
    draft.legs.splice(Number(button.dataset.row), 1);
    render();
  },
  cancel() {
    draft = null;
    render();
  },
};

const detail = document.getElementById("option-detail");

on(detail, "click", "[data-editor-action]", (button) => actions[button.dataset.editorAction](button));

on(detail, "input", "[data-editor] [data-field]", (input) => {
  const { field, row } = input.dataset;
  if (row === undefined) draft[field] = input.value;
  else {
    draft.legs[row][field] = input.value;
    check(input.form, Number(row));
  }
});

// Typing a known airport code fills in its timezone.
on(detail, "change", '[data-editor] [data-field="from"], [data-editor] [data-field="to"]', (input) => {
  const { field, row } = input.dataset;
  const zoneField = `${field}Tz`;
  input.value = input.value.trim().toUpperCase();
  draft.legs[row][field] = input.value;
  const airport = findAirport(input.value);
  if (!airport) return;
  draft.legs[row][zoneField] = airport.tz;
  input.form.querySelector(`[data-field="${zoneField}"][data-row="${row}"]`).value = airport.tz;
  check(input.form, Number(row));
});

on(detail, "submit", "[data-editor]", (form, event) => {
  event.preventDefault();
  save();
});

on(detail, "keydown", "[data-editor]", (form, event) => {
  if (event.key === "Escape") actions.cancel();
});
