// The settings dialog. Each field is named after the setting it edits.
import { state, commit } from "../app.js";
import { applySettings } from "../calendar.js";
import { isCurrency } from "../format.js";
import { findTimezone } from "../timezones.js";
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
  "googleClientId",
];
const NUMBERS = ["minutesToAirport", "minutesAtAirport", "minutesFromAirport", "daysToShow", "weekStart"];

document.getElementById("open-settings").addEventListener("click", async () => {
  fill(state.settings);
  if ((await showDialog(dialog)) !== "save") return;
  commit((s) => Object.assign(s.settings, read()));
  applySettings();
});

const EXTRA_ZONES = ["extraTimezone1", "extraTimezone2"];
const TIMEZONE_FIELDS = ["displayTz", "sleepTz", ...EXTRA_ZONES];

function fill(settings) {
  PLAIN.forEach((name) => (fields[name].value = settings[name]));
  EXTRA_ZONES.forEach((name, i) => (fields[name].value = settings.extraTimezones[i] ?? ""));
  fields.sleepEnabled.checked = settings.sleepEnabled;
  check();
}

function read() {
  const settings = Object.fromEntries(PLAIN.map((name) => [name, fields[name].value.trim()]));
  NUMBERS.forEach((name) => (settings[name] = Number(settings[name])));
  settings.currency = settings.currency.toUpperCase();
  settings.displayTz = findTimezone(settings.displayTz);
  settings.sleepTz = findTimezone(settings.sleepTz) ?? state.settings.sleepTz;
  settings.extraTimezones = EXTRA_ZONES.map((name) => findTimezone(fields[name].value)).filter(Boolean);
  settings.sleepEnabled = fields.sleepEnabled.checked;
  return settings;
}

form.addEventListener("input", check);

function check() {
  const problem = (input, message) => input.setCustomValidity(message);
  const sleeping = fields.sleepEnabled.checked;

  for (const name of TIMEZONE_FIELDS) {
    const input = fields[name];
    const optional = EXTRA_ZONES.includes(name) || (name === "sleepTz" && !sleeping);
    const fine = (optional && !input.value.trim()) || findTimezone(input.value);
    problem(input, fine ? "" : "Unknown timezone. Try a city, like Chicago.");
  }
  problem(fields.currency, isCurrency(fields.currency.value) ? "" : "Use a three-letter code, like USD.");
  const sameTimes = sleeping && fields.sleepStart.value === fields.sleepEnd.value;
  problem(fields.sleepEnd, sameTimes ? "Wake-up time has to differ from bedtime." : "");
}
