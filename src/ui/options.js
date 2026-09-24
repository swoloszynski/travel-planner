// The options being compared, and the itineraries in the chosen one.
import { state, commit, onChange, render } from "../app.js";
import {
  activeTrip,
  addOption,
  deleteItinerary,
  deleteLeg,
  deleteOption,
  findItinerary,
} from "../state.js";
import {
  KIND_LABELS,
  arrival,
  dayChange,
  departure,
  flightMinutes,
  minutesBetween,
  optionCost,
} from "../model.js";
import { describeOption } from "../describe.js";
import { googleFlightsSearches } from "../google-flights.js";
import { bookingText } from "../booking-text.js";
import { formatDate, formatDuration, formatPrice, formatTime, parsePrice } from "../format.js";
import { html } from "../html.js";
import { confirmed, on, redraw } from "./dom.js";
import { say } from "./status.js";
import { chooseOption, chosenOption } from "./chosen.js";
import { addToBooking } from "./add-flights.js";
import { editLeg, legEditor, legEditorDrawn } from "./leg-editor.js";

const list = document.getElementById("option-list");
const detail = document.getElementById("option-detail");

function findOption(id) {
  return activeTrip(state).options.find((o) => o.id === id);
}

onChange(() => {
  const chosen = chosenOption();
  redraw(list, html`${activeTrip(state).options.map((option) => optionRow(option, option === chosen))}`);
  redraw(detail, optionDetail(describeOption(chosen, state.settings)));
  legEditorDrawn();
});

// Drawing

function costText({ total, unpriced, count }) {
  if (!count) return "No flights yet";
  if (unpriced === count) return "No prices yet";
  const price = formatPrice(total, state.settings.currency);
  return unpriced ? `${price} + ${unpriced} unpriced` : price;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function optionRow(option, isChosen) {
  return html`
    <li style="--option-color: ${option.color}" aria-current="${isChosen}">
      <input type="checkbox" data-action="toggle-option" data-id="${option.id}"
        ${option.visible ? html`checked` : ""} aria-label="Show ${option.name} on the calendar">
      <input type="color" data-action="color-option" data-id="${option.id}" value="${option.color}"
        aria-label="Color for ${option.name}">
      <button class="option-name" data-action="choose-option" data-id="${option.id}">
        <span>${option.name}</span>
        <small>${costText(optionCost(option.itineraries))}</small>
      </button>
    </li>`;
}

function optionDetail(option) {
  const { cost, transfers, sleepMinutes } = option;
  const notes = [
    cost.count ? `${plural(cost.count, "booking")} to make` : "",
    transfers.length ? plural(transfers.length, "separate-booking connection") : "",
    sleepMinutes ? `${formatDuration(sleepMinutes)} during usual sleep` : "",
  ].filter(Boolean);

  return html`
    <header style="--option-color: ${option.color}">
      <hgroup>
        <input class="option-name-input" data-action="rename-option" data-id="${option.id}" value="${option.name}"
          aria-label="Option name" title="Click to rename">
        <p>${notes.join(" · ")}</p>
      </hgroup>
      <strong>${cost.count ? costText(cost) : ""}</strong>
    </header>
    ${option.itineraries.length
      ? html`<ol class="itineraries">${option.itineraries.map(itineraryCard)}</ol>`
      : html`<p class="empty">No flights yet.</p>`}
    <footer class="actions">
      <button class="link danger" data-action="delete-option" data-id="${option.id}"
        data-confirm="Click again to delete this option and its flights">Delete option</button>
    </footer>`;
}

function itineraryCard(itinerary) {
  const { id, number, kind, route, directions, transfer, sleepMinutes, price } = itinerary;
  const dates = [...new Set(directions.map((d) => formatDate(departure(d[0]))))].join(" – ");
  const details = directions.length === 1 ? [dates, stopsText(directions[0])] : [dates];

  return html`
    <li class="itinerary">
      ${transfer &&
      html`<p class="warning">
        Connects from booking ${number - 1} in ${transfer.airport} (${formatDuration(transfer.minutes)}) on a
        separate booking. If the earlier flight is late, this airline doesn't have to rebook you.
      </p>`}
      <div class="itinerary-head">
        <hgroup>
          <p class="eyebrow">Booking ${number} <span class="kind kind-${kind}">${KIND_LABELS[kind]}</span></p>
          <h3>${route}</h3>
          <p>${details.join(" · ")}</p>
          ${sleepMinutes ? html`<p class="sleep-note">${formatDuration(sleepMinutes)} during usual sleep</p>` : ""}
        </hgroup>
        <label class="price">
          Price
          <input inputmode="decimal" placeholder="Add price" data-action="set-price" data-id="${id}"
            value="${price ?? ""}">
        </label>
      </div>
      ${directions.map((direction, i) => directionBlock(direction, directionName(kind, directions.length, i)))}
      <footer class="itinerary-actions">
        <button class="link" data-action="add-flight" data-id="${id}">+ Add flight</button>
        <button class="link" data-action="copy-booking" data-id="${id}">Copy flights</button>
        ${googleFlightsSearches(itinerary.legs).map(
          ({ label, url }) => html`<a class="link" href="${url}" target="_blank" rel="noopener">${label} ↗</a>`
        )}
        <button class="link danger" data-action="delete-itinerary" data-id="${id}"
          data-confirm="Click again to delete">Delete booking</button>
      </footer>
    </li>`;
}

function directionName(kind, count, index) {
  if (count === 1) return "";
  if (kind === "roundtrip") return index === 0 ? "Outbound" : "Return";
  return `Flight ${index + 1}`;
}

function stopsText(direction) {
  return direction.length === 1 ? "Nonstop" : plural(direction.length - 1, "stop");
}

function directionBlock(direction, name) {
  const first = direction[0];
  const last = direction.at(-1);
  return html`
    <section class="direction">
      ${name &&
      html`<h4>${name} · ${first.from} → ${last.to} · ${formatDate(departure(first))} · ${stopsText(direction)}</h4>`}
      ${direction.map((leg, i) => {
        const previous = direction[i - 1];
        const layover = previous && minutesBetween(arrival(previous), departure(leg));
        return html`
          ${previous && html`<p class="layover">${formatDuration(layover)} layover in ${previous.to}</p>`}
          ${legRow(leg)}`;
      })}
    </section>`;
}

function legRow(leg) {
  const editor = legEditor(leg.id);
  if (editor) return editor;
  const days = dayChange(leg);
  const carrier = [leg.airline, leg.flightNumber].filter(Boolean).join(" ") || "Flight";
  return html`
    <div class="leg">
      <p class="leg-times">
        <strong>${formatTime(departure(leg))}</strong> ${leg.from}
        →
        <strong>${formatTime(arrival(leg))}</strong>${days ? html`<sup>${days > 0 ? "+" : ""}${days}</sup>` : ""}
        ${leg.to}
      </p>
      <p class="leg-about">${carrier} · ${formatDuration(flightMinutes(leg))}</p>
      <p class="leg-actions">
        <button class="link" data-action="edit-leg" data-id="${leg.id}">Edit</button>
        <button class="link danger" data-action="delete-leg" data-id="${leg.id}">Remove</button>
      </p>
    </div>`;
}

// Editing

const actions = {
  "choose-option"(id) {
    chooseOption(id);
    render();
  },

  "toggle-option"(id, input) {
    commit(() => (findOption(id).visible = input.checked));
  },

  "color-option"(id, input) {
    commit(() => (findOption(id).color = input.value));
  },

  // Starts with a placeholder name, ready to type over.
  "add-option"() {
    commit(() => chooseOption(addOption(activeTrip(state)).id));
    detail.querySelector(".option-name-input").select();
  },

  "rename-option"(id, input) {
    const name = input.value.trim();
    if (name) commit(() => (findOption(id).name = name));
    else input.value = findOption(id).name;
  },

  "delete-option"(id, button) {
    if (confirmed(button)) commit(() => deleteOption(activeTrip(state), id));
  },

  "set-price"(id, input) {
    commit(() => (findItinerary(activeTrip(state), id).itinerary.price = parsePrice(input.value)));
  },

  "delete-itinerary"(id, button) {
    if (!confirmed(button)) return;
    commit(() => {
      const { option } = findItinerary(activeTrip(state), id);
      deleteItinerary(option, id);
    });
  },

  "add-flight"(id) {
    addToBooking(chosenOption().id, id);
  },

  "edit-leg": editLeg,

  // Copies the booking in a form Add flights can read, to add it to
  // another option.
  async "copy-booking"(id) {
    const { itinerary } = findItinerary(activeTrip(state), id);
    try {
      await navigator.clipboard.writeText(bookingText(itinerary, state.settings.currency));
      say("Copied. Paste into Add flights, then choose Fill in from paste.");
    } catch {
      say("Couldn't copy to the clipboard.");
    }
  },

  "delete-leg"(id) {
    commit(() => deleteLeg(activeTrip(state), id));
  },
};

function handle(element) {
  actions[element.dataset.action](element.dataset.id, element);
}

// Enter keeps a new option name; Escape puts back the old one.
on(detail, "keydown", ".option-name-input", (input, event) => {
  if (event.key === "Enter") input.blur();
  if (event.key === "Escape") {
    input.value = findOption(input.dataset.id).name;
    input.blur();
  }
});

for (const section of [document.getElementById("options"), detail]) {
  on(section, "click", "button[data-action]", handle);
  on(section, "change", "input[data-action], select[data-action]", handle);
}
