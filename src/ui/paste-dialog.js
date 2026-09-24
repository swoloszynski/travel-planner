// Adding flights by pasting text copied from Google Flights.
import { state } from "../app.js";
import { parseFlights } from "../parse.js";
import { arrival, departure } from "../model.js";
import { formatDate, formatPrice, formatTime } from "../format.js";
import { html } from "../html.js";
import { showDialog } from "./dom.js";

const dialog = document.getElementById("paste-dialog");
const text = dialog.querySelector("textarea");
const preview = dialog.querySelector("output");
const add = dialog.querySelector("button[value=add]");

let found = { legs: [], price: null };

// Resolves with the flights found and their price, or null if cancelled.
export async function pasteFlights(optionName) {
  text.value = "";
  dialog.querySelector("h2").textContent = `Paste flights into ${optionName}`;
  update();
  return (await showDialog(dialog)) === "add" ? found : null;
}

text.addEventListener("input", update);

function update() {
  found = parseFlights(text.value);
  const unknown = found.legs.flatMap((leg) => [
    ...(leg.fromTz ? [] : [leg.from]),
    ...(leg.toTz ? [] : [leg.to]),
  ]);
  add.disabled = !found.legs.length || unknown.length > 0;
  preview.innerHTML = text.value.trim() ? describe(found, unknown) : "";
}

function describe({ legs, price }, unknown) {
  if (!legs.length) {
    return html`<p>No flights found. Check that the text includes dates, times and airport codes.</p>`;
  }
  if (unknown.length) {
    return html`<p>
      The timezone for ${[...new Set(unknown)].join(", ")} isn't known. Use Add flight to enter these flights
      by hand.
    </p>`;
  }
  return html`
    <p>Found ${legs.length === 1 ? "1 flight" : `${legs.length} flights`}. They'll be added as one booking.</p>
    <ul>
      ${legs.map((leg) => {
        const carrier = [leg.airline, leg.flightNumber].filter(Boolean).join(" ");
        return html`<li>
          ${formatDate(departure(leg))}: ${leg.from} ${formatTime(departure(leg))} → ${leg.to}
          ${formatTime(arrival(leg))}${carrier && html` · ${carrier}`}
        </li>`;
      })}
    </ul>
    <p>${price === null ? "No price found." : `Price: ${formatPrice(price, state.settings.currency)}`}</p>
    <p><small>Check the flights after adding them. If some are booked separately, add them one paste at a time.</small></p>`;
}
