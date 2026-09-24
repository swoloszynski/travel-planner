// Suggestions for airport and timezone fields, used through their `list`
// attribute.
import { AIRPORTS } from "../data/airports.js";
import { TIMEZONES, findTimezone, timezoneLabel } from "../timezones.js";
import { html } from "../html.js";
import { on } from "./dom.js";

document.getElementById("airports").innerHTML = html`${AIRPORTS.map(
  ({ code, name, city }) => html`<option value="${code}">${code} · ${name}, ${city}</option>`
)}`;

document.getElementById("timezones").innerHTML = html`${TIMEZONES.map(
  (zone) => html`<option value="${zone}">${timezoneLabel(zone)}</option>`
)}`;

// A timezone typed as "new york" or "PST" becomes its full name once the
// field loses focus. The input event lets forms check it again.
on(document, "change", 'input[list="timezones"]', (input) => {
  const zone = findTimezone(input.value);
  if (zone && zone !== input.value) {
    input.value = zone;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
});
