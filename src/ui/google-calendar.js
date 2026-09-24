// Shows the user's own Google Calendar events, in grey, next to the
// flights. Read-only.
import { DateTime } from "luxon";
import { state, commit, onChange } from "../app.js";
import { calendar, toDisplay } from "../calendar.js";
import { SignInExpired, listCalendars, listEvents, savedToken, signIn, signOut } from "../google.js";
import { html } from "../html.js";
import { redraw } from "./dom.js";

const status = document.getElementById("google-status");
const list = document.getElementById("google-calendars");
const connectButton = document.getElementById("google-connect");
const disconnectButton = document.getElementById("google-disconnect");

let token = savedToken();
let calendars = [];
let expired = false;
let failure = "";
// Signing in is tied to a client ID, so changing it in settings signs out.
let clientId = state.settings.googleClientId;

calendar.addEventSource({ id: "google", events: googleEvents });
onChange(drawPanel);
if (token) loadCalendars();

function isConnected() {
  return Boolean(token) && calendars.length > 0;
}

function drawPanel() {
  if (state.settings.googleClientId !== clientId) {
    clientId = state.settings.googleClientId;
    if (isConnected()) disconnect();
  }

  connectButton.hidden = isConnected();
  connectButton.disabled = !clientId;
  connectButton.textContent = expired ? "Reconnect" : "Connect Google Calendar";
  disconnectButton.hidden = !isConnected() && !expired;

  if (failure) status.textContent = `Couldn't connect to Google Calendar: ${failure}`;
  else if (!clientId) status.textContent = "Add an OAuth client ID below to show your calendar.";
  else if (expired) status.textContent = "Google sign-in lasts an hour. Reconnect to keep showing your events.";
  else if (!isConnected()) status.textContent = "Show your own events next to the flights. Read-only; nothing from Google is saved.";
  else status.textContent = "Your events show in grey. Choose which calendars to include:";

  const chosen = state.settings.googleCalendarIds;
  redraw(
    list,
    isConnected()
      ? html`${calendars.map(
          (c) => html`<li>
            <label>
              <input type="checkbox" data-action="toggle-calendar" data-id="${c.id}"
                ${chosen.includes(c.id) ? html`checked` : ""}>
              <span class="swatch" style="background: ${c.color}"></span>
              ${c.name}
            </label>
          </li>`
        )}`
      : ""
  );
}

async function loadCalendars() {
  try {
    calendars = await listCalendars(token);
  } catch (error) {
    handle(error);
    return;
  }
  // The first time, "primary" stands in for the user's main calendar.
  const primary = calendars.find((c) => c.primary);
  commit((s) => {
    s.settings.googleCalendarIds = s.settings.googleCalendarIds
      .map((id) => (id === "primary" && primary ? primary.id : id))
      .filter((id) => calendars.some((c) => c.id === id));
  });
  calendar.getEventSourceById("google").refetch();
}

function disconnect() {
  signOut(token);
  token = null;
  calendars = [];
  expired = false;
  calendar.getEventSourceById("google").refetch();
}

function handle(error) {
  if (error instanceof SignInExpired) {
    signOut(null);
    token = null;
    calendars = [];
    expired = true;
    drawPanel();
  } else {
    console.error(error);
  }
}

connectButton.addEventListener("click", async () => {
  try {
    token = await signIn(clientId);
  } catch (error) {
    failure = error.message;
    drawPanel();
    return;
  }
  failure = "";
  expired = false;
  await loadCalendars();
});

disconnectButton.addEventListener("click", () => {
  disconnect();
  drawPanel();
});

list.addEventListener("change", (event) => {
  const { id } = event.target.dataset;
  commit((s) => {
    const others = s.settings.googleCalendarIds.filter((other) => other !== id);
    s.settings.googleCalendarIds = event.target.checked ? [...others, id] : others;
  });
  calendar.getEventSourceById("google").refetch();
});

// FullCalendar gives its range without an offset, in the display zone.
async function googleEvents(info, success, failure) {
  const ids = state.settings.googleCalendarIds;
  if (!isConnected() || !ids.length) return success([]);
  const toUtc = (time) => DateTime.fromISO(time, { zone: state.settings.displayTz }).toUTC().toISO();
  try {
    const lists = await Promise.all(ids.map((id) => listEvents(token, id, toUtc(info.startStr), toUtc(info.endStr))));
    success(lists.flat().map(toCalendarEvent));
  } catch (error) {
    handle(error);
    failure(error);
  }
}

function toCalendarEvent(event) {
  const look = { title: event.summary || "(No title)", classNames: ["google-event"] };
  if (event.start.date) return { ...look, start: event.start.date, end: event.end.date, allDay: true };
  return {
    ...look,
    start: toDisplay(DateTime.fromISO(event.start.dateTime)),
    end: toDisplay(DateTime.fromISO(event.end.dateTime)),
  };
}
