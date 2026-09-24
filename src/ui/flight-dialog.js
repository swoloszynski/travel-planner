// Adding or editing one flight by hand.
import { findAirport } from "../data/airports.js";
import { arrival, departure } from "../model.js";
import { findTimezone } from "../timezones.js";
import { showDialog } from "./dom.js";

const dialog = document.getElementById("flight-dialog");
const form = dialog.querySelector("form");
const fields = form.elements;
const title = dialog.querySelector("h2");
const save = dialog.querySelector("button[value=save]");

// The form's field names match a leg's properties.
const NAMES = ["airline", "flightNumber", "from", "fromTz", "departs", "to", "toTz", "arrives"];

// Resolves with the flight as typed, or null if cancelled. `leg` fills
// in the form to start with.
export async function editFlight(leg, { heading, saveLabel }) {
  NAMES.forEach((name) => (fields[name].value = leg[name] ?? ""));
  title.textContent = heading;
  save.textContent = saveLabel;
  check();
  if ((await showDialog(dialog)) !== "save") return null;
  return typed();
}

function typed() {
  const leg = Object.fromEntries(NAMES.map((name) => [name, fields[name].value.trim()]));
  return { ...leg, fromTz: findTimezone(leg.fromTz) ?? "", toTz: findTimezone(leg.toTz) ?? "" };
}

// Typing a known airport code fills in its timezone.
for (const [code, zone] of [["from", "fromTz"], ["to", "toTz"]]) {
  fields[code].addEventListener("change", () => {
    fields[code].value = fields[code].value.trim().toUpperCase();
    const airport = findAirport(fields[code].value);
    if (airport) fields[zone].value = airport.tz;
    check();
  });
}

form.addEventListener("input", check);

function check() {
  for (const name of ["fromTz", "toTz"]) {
    const input = fields[name];
    const unknown = input.value && !findTimezone(input.value);
    input.setCustomValidity(unknown ? "Unknown timezone. Try a city, like Chicago." : "");
  }
  const leg = typed();
  const complete = leg.departs && leg.arrives && leg.fromTz && leg.toTz;
  const backwards = complete && arrival(leg) <= departure(leg);
  fields.arrives.setCustomValidity(backwards ? "The flight has to land after it leaves." : "");
}
