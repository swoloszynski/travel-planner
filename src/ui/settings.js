// The settings dialog. Each field is named after the setting it edits.
import { state, commit } from "../app.js";
import { applySettings } from "../calendar.js";
import { isCurrency, isTimezone } from "../format.js";
import { showDialog } from "./dom.js";

const dialog = document.getElementById("settings-dialog");
const form = dialog.querySelector("form");
const fields = form.elements;

const PLAIN = [
  "displayTz",
  "minutesToAirport",
  "minutesAtAirport",
  "minutesFromAirport",
  "daysToShow",
  "weekStart",
  "currency",
  "sleepStart",
  "sleepEnd",
  "sleepTz",
];
const NUMBERS = ["minutesToAirport", "minutesAtAirport", "minutesFromAirport", "daysToShow", "weekStart"];

document.getElementById("open-settings").addEventListener("click", async () => {
  fill(state.settings);
  if ((await showDialog(dialog)) !== "save") return;
  commit((s) => Object.assign(s.settings, read()));
  applySettings();
});

function fill(settings) {
  PLAIN.forEach((name) => (fields[name].value = settings[name]));
  fields.extraTimezones.value = settings.extraTimezones.join(", ");
  fields.sleepEnabled.checked = settings.sleepEnabled;
  check();
}

function read() {
  const settings = Object.fromEntries(PLAIN.map((name) => [name, fields[name].value.trim()]));
  NUMBERS.forEach((name) => (settings[name] = Number(settings[name])));
  settings.currency = settings.currency.toUpperCase();
  settings.extraTimezones = extraTimezones();
  settings.sleepEnabled = fields.sleepEnabled.checked;
  return settings;
}

function extraTimezones() {
  return fields.extraTimezones.value
    .split(",")
    .map((zone) => zone.trim())
    .filter(Boolean);
}

form.addEventListener("input", check);

function check() {
  const problem = (input, message) => input.setCustomValidity(message);
  const sleeping = fields.sleepEnabled.checked;

  problem(fields.displayTz, isTimezone(fields.displayTz.value) ? "" : "Pick a timezone from the list.");
  const unknown = extraTimezones().filter((zone) => !isTimezone(zone));
  problem(fields.extraTimezones, unknown.length ? `Unknown timezone: ${unknown.join(", ")}` : "");
  problem(fields.currency, isCurrency(fields.currency.value) ? "" : "Use a three-letter code, like USD.");
  problem(fields.sleepTz, !sleeping || isTimezone(fields.sleepTz.value) ? "" : "Pick a timezone from the list.");
  const sameTimes = sleeping && fields.sleepStart.value === fields.sleepEnd.value;
  problem(fields.sleepEnd, sameTimes ? "Wake-up time has to differ from bedtime." : "");
}
