// The options being compared, and the itineraries in the chosen one.
import { state, commit, onChange, render } from "../app.js";
import {
  activeTrip,
  addOption,
  deleteItinerary,
  deleteLeg,
  deleteOption,
  findItinerary,
  mergeItineraries,
  nextOptionName,
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
import { formatDate, formatDuration, formatPrice, formatTime, parsePrice } from "../format.js";
import { html } from "../html.js";
import { on, redraw } from "./dom.js";
import { askText, confirmDelete, tell } from "./ask.js";
import { addBooking, addToItinerary, editLeg, editorAt, editorDrawn } from "./flight-editor.js";

const list = document.getElementById("option-list");
const detail = document.getElementById("option-detail");

// The option whose itineraries are shown. Not saved.
let chosenId = null;

export function chooseOption(id) {
  chosenId = id;
  render();
}

function chosenOption() {
  const { options } = activeTrip(state);
  return (
    options.find((o) => o.id === chosenId) ?? options.find((o) => o.itineraries.length) ?? options[0]
  );
}

function findOption(id) {
  return activeTrip(state).options.find((o) => o.id === id);
}

onChange(() => {
  const chosen = chosenOption();
  redraw(list, html`${activeTrip(state).options.map((option) => optionRow(option, option === chosen))}`);
  redraw(detail, optionDetail(describeOption(chosen, state.settings)));
  editorDrawn(detail);
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
        <h2>${option.name}</h2>
        <p>${notes.join(" · ")}</p>
      </hgroup>
      <strong>${cost.count ? costText(cost) : ""}</strong>
    </header>
    ${editorAt("option", option.id) ??
    html`<p><button data-action="add-booking" data-id="${option.id}">Add flights</button></p>`}
    ${option.itineraries.length
      ? html`<ol class="itineraries">${option.itineraries.map(itineraryCard)}</ol>`
      : html`<p class="empty">No flights yet.</p>`}
    <footer class="actions">
      <button class="secondary outline" data-action="rename-option" data-id="${option.id}">Rename</button>
      <button class="secondary outline" data-action="delete-option" data-id="${option.id}">Delete option</button>
    </footer>`;
}

function itineraryCard(itinerary, index, all) {
  const { id, number, kind, route, directions, transfer, sleepMinutes, price } = itinerary;
  const others = all.filter((other) => other !== itinerary);
  const dates = [...new Set(directions.map((d) => formatDate(departure(d[0]))))].join(" – ");
  const details = directions.length === 1 ? [dates, stopsText(directions[0])] : [dates];

  return html`
    <li class="itinerary">
      ${transfer &&
      html`<p class="warning">
        Connects from itinerary ${number - 1} in ${transfer.airport} (${formatDuration(transfer.minutes)}) on a
        separate booking. If the earlier flight is late, this airline doesn't have to rebook you.
      </p>`}
      <div class="itinerary-head">
        <hgroup>
          <p>Itinerary ${number} · ${KIND_LABELS[kind]}</p>
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
      ${editorAt("itinerary", id)}
      <footer class="itinerary-actions">
        <button class="link" data-action="add-flight" data-id="${id}">Add flight</button>
        ${others.length > 0 &&
        html`<select data-action="merge-itinerary" data-id="${id}" aria-label="Combine with another itinerary">
          <option value="">Same booking as…</option>
          ${others.map((other) => html`<option value="${other.id}">Itinerary ${other.number}: ${other.route}</option>`)}
        </select>`}
        <button class="link danger" data-action="delete-itinerary" data-id="${id}">Delete itinerary</button>
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
  const editor = editorAt("leg", leg.id);
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
  },

  "toggle-option"(id, input) {
    commit(() => (findOption(id).visible = input.checked));
  },

  "color-option"(id, input) {
    commit(() => (findOption(id).color = input.value));
  },

  async "add-option"() {
    const trip = activeTrip(state);
    const name = await askText("Name the new option", nextOptionName(trip));
    if (!name) return;
    commit(() => (chosenId = addOption(trip, name).id));
  },

  async "rename-option"(id) {
    const name = await askText("Rename this option", findOption(id).name);
    if (name) commit(() => (findOption(id).name = name));
  },

  async "delete-option"(id) {
    const option = findOption(id);
    const text = option.itineraries.length ? "This deletes all its flights." : "";
    if (await confirmDelete(`Delete ${option.name}?`, text)) {
      commit(() => deleteOption(activeTrip(state), id));
    }
  },

  "set-price"(id, input) {
    commit(() => (findItinerary(activeTrip(state), id).itinerary.price = parsePrice(input.value)));
  },

  async "merge-itinerary"(id, select) {
    const trip = activeTrip(state);
    const { option, itinerary } = findItinerary(trip, id);
    const into = findItinerary(trip, select.value)?.itinerary;
    if (!into) return;
    const bothPriced = itinerary.price !== null && into.price !== null;
    commit(() => mergeItineraries(option, id, into.id));
    if (bothPriced) {
      await tell("Prices added together", "Both itineraries had a price. Change it if the combined fare is different.");
    }
  },

  async "delete-itinerary"(id) {
    if (!(await confirmDelete("Delete this itinerary?", "This deletes all its flights."))) return;
    commit(() => {
      const { option } = findItinerary(activeTrip(state), id);
      deleteItinerary(option, id);
    });
  },

  "add-booking": addBooking,
  "add-flight": addToItinerary,
  "edit-leg": editLeg,

  "delete-leg"(id) {
    commit(() => deleteLeg(activeTrip(state), id));
  },
};

function handle(element) {
  actions[element.dataset.action](element.dataset.id, element);
}

for (const section of [document.getElementById("options"), detail]) {
  on(section, "click", "button[data-action]", handle);
  on(section, "change", "input[data-action], select[data-action]", handle);
}
