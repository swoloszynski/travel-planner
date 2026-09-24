// The fields for one flight, used by the Add flights panel and by editing a
// flight in place. Forms marked data-flights hold one set of fields per
// row, and typing keeps the matching leg in step.
import { findAirport } from "../data/airports.js";
import { arrival, departure } from "../model.js";
import { findTimezone } from "../timezones.js";
import { html } from "../html.js";
import { on } from "./dom.js";

const FIELDS = ["airline", "flightNumber", "from", "fromTz", "departs", "to", "toTz", "arrives"];

export function blankLeg(details = {}) {
  return { ...Object.fromEntries(FIELDS.map((name) => [name, ""])), ...details };
}

export function copyLeg(leg) {
  return Object.fromEntries(FIELDS.map((name) => [name, leg[name]]));
}

// The leg as typed, ready to save: trimmed, with full timezone names.
export function cleaned(leg) {
  const trimmed = Object.fromEntries(FIELDS.map((name) => [name, leg[name].trim()]));
  return { ...trimmed, fromTz: findTimezone(trimmed.fromTz) ?? "", toTz: findTimezone(trimmed.toTz) ?? "" };
}

// A numbered row gets a heading and a Remove button, for forms with more
// than one flight.
export function flightFields(leg, row, numbered) {
  const input = (field, attributes = html``) =>
    html`<input data-field="${field}" data-row="${row}" value="${leg[field]}" ${attributes}>`;
  return html`
    <fieldset class="flight-fields">
      ${numbered &&
      html`<legend>
        Flight ${row + 1}
        <button type="button" class="link danger" data-remove-row="${row}">Remove</button>
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

// Marks timezones that aren't known, and flights that land before they
// leave, so the form won't submit.
export function checkFlights(form, legs) {
  legs.forEach((leg, row) => {
    const field = (name) => form.querySelector(`[data-field="${name}"][data-row="${row}"]`);
    for (const name of ["fromTz", "toTz"]) {
      const unknown = leg[name].trim() && !findTimezone(leg[name]);
      field(name).setCustomValidity(unknown ? "Unknown timezone. Try a city, like Chicago." : "");
    }
    const typed = cleaned(leg);
    const complete = typed.departs && typed.arrives && typed.fromTz && typed.toTz;
    const backwards = complete && arrival(typed) <= departure(typed);
    field("arrives").setCustomValidity(backwards ? "The flight has to land after it leaves." : "");
  });
}

// Keeps `getLegs()` in step with the fields in `root`, and fills in the
// timezone of a known airport once its code is typed.
export function trackFlightFields(root, getLegs) {
  on(root, "input", "[data-flights] [data-row]", (input) => {
    const legs = getLegs();
    legs[input.dataset.row][input.dataset.field] = input.value;
    checkFlights(input.form, legs);
  });

  on(root, "change", '[data-flights] [data-field="from"], [data-flights] [data-field="to"]', (input) => {
    const legs = getLegs();
    const { field, row } = input.dataset;
    input.value = input.value.trim().toUpperCase();
    legs[row][field] = input.value;
    const airport = findAirport(input.value);
    if (airport) {
      legs[row][`${field}Tz`] = airport.tz;
      input.form.querySelector(`[data-field="${field}Tz"][data-row="${row}"]`).value = airport.tz;
    }
    checkFlights(input.form, legs);
  });
}
