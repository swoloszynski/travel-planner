// Suggestions for airport and timezone fields, used through their `list`
// attribute.
import { AIRPORTS } from "../data/airports.js";
import { html } from "../html.js";

document.getElementById("airports").innerHTML = html`${AIRPORTS.map(
  ({ code, name, city }) => html`<option value="${code}">${code} · ${name}, ${city}</option>`
)}`;

document.getElementById("timezones").innerHTML = html`${Intl.supportedValuesOf("timeZone").map(
  (zone) => html`<option value="${zone}"></option>`
)}`;
