// The Add flights panel: pick the option and booking, paste from Google
// Flights, check the flights it fills in, and add them.
import { state, commit, onChange, render } from "../app.js";
import { activeTrip, addItinerary, addLeg, addOption } from "../state.js";
import { KIND_LABELS, departure, sortByDeparture } from "../model.js";
import { describeOption } from "../describe.js";
import { parseFlights } from "../parse.js";
import { formatDate, formatPrice, parsePrice } from "../format.js";
import { html } from "../html.js";
import { on, redraw } from "./dom.js";
import { chooseOption, chosenOption } from "./chosen.js";
import { blankLeg, checkFlights, cleaned, flightFields, trackFlightFields } from "./flight-fields.js";

const panel = document.getElementById("add-flights");

// What's typed so far. The option comes from chosen.js, shared with the
// right-hand panel. Not saved.
let draft = newDraft("new");

function newDraft(bookingId, legs = [blankLeg()]) {
  return { bookingId, pasted: "", legs, price: "", message: "" };
}

function chosenBooking() {
  return chosenOption().itineraries.find((it) => it.id === draft.bookingId) ?? null;
}

// Starts a flight where the booking's last flight lands.
function legAfter(booking) {
  const last = sortByDeparture(booking.legs).at(-1);
  return blankLeg({ from: last.to, fromTz: last.toTz });
}

// Points the panel at a booking, from its "Add flight" link on the right.
export function addToBooking(optionId, bookingId) {
  chooseOption(optionId);
  draft = newDraft(bookingId);
  draft.legs = [legAfter(chosenBooking())];
  render();
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
  panel.querySelector("textarea").focus();
}

onChange(() => {
  if (!chosenBooking()) draft.bookingId = "new";
  redraw(panel, form());
  checkFlights(panel.querySelector("form"), draft.legs);
});

function form() {
  const option = chosenOption();
  const bookings = describeOption(option, state.settings).itineraries;
  const isNew = draft.bookingId === "new";

  return html`
    <form data-flights>
      <h3>1. Where does it go?</h3>
      <label>
        Option
        <select data-builder="option">
          ${activeTrip(state).options.map(
            (o) => html`<option value="${o.id}" ${o === option ? html`selected` : ""}>${o.name}</option>`
          )}
          <option value="new">+ New option</option>
        </select>
      </label>
      <label>
        Booking
        <select data-builder="booking">
          <option value="new">New booking, with its own price</option>
          ${bookings.map(
            (b) => html`<option value="${b.id}" ${b.id === draft.bookingId ? html`selected` : ""}>
              Booking ${b.number}: ${b.route} (${KIND_LABELS[b.kind]}, ${formatDate(departure(b.legs[0]))})
            </option>`
          )}
        </select>
      </label>
      <p class="hint">
        A booking is one ticket with one price. Add a return or connecting flight to an existing booking if it's
        on the same ticket.
      </p>

      <h3>2. Paste from Google Flights</h3>
      <textarea rows="4" data-builder="pasted"
        placeholder="Mon, Oct 5&#10;Delta&#10;6:00 AM – 9:32 AM&#10;JFK–LAX&#10;$289">${draft.pasted}</textarea>
      <button type="button" class="secondary small" data-builder-action="fill">Fill in from paste ↓</button>
      ${draft.message && html`<p class="hint" role="status">${draft.message}</p>`}

      <h3>3. Check the flight details</h3>
      ${draft.legs.map((leg, row) => flightFields(leg, row, draft.legs.length > 1))}
      <p><button type="button" class="link" data-builder-action="add-row">+ Add another flight</button></p>
      ${isNew &&
      html`<label>
        Price for this booking
        <input inputmode="decimal" placeholder="342.00" data-builder="price" value="${draft.price}">
      </label>`}
      <div class="actions">
        <button>${isNew ? "Add booking" : "Add to booking"}</button>
        <button type="button" class="secondary outline" data-builder-action="clear">Clear</button>
      </div>
    </form>`;
}

function fillFromPaste() {
  const { legs, price } = parseFlights(draft.pasted);
  if (!legs.length) {
    draft.message = "No flights found. Check that the text includes dates, times and airport codes.";
    return;
  }
  draft.legs = legs;
  const priced = draft.bookingId === "new" && price !== null;
  if (priced) draft.price = String(price);

  const unknown = [...new Set(legs.flatMap((leg) => [!leg.fromTz && leg.from, !leg.toTz && leg.to]).filter(Boolean))];
  const found = legs.length === 1 ? "1 flight" : `${legs.length} flights`;
  const at = priced ? ` at ${formatPrice(price, state.settings.currency)}` : "";
  draft.message =
    `Filled in ${found}${at}. Check ${legs.length === 1 ? "it" : "them"} below, then add.` +
    (unknown.length ? ` Enter the timezone for ${unknown.join(" and ")}.` : "");
}

function save() {
  const legs = draft.legs.map(cleaned);
  const option = chosenOption();
  const booking = chosenBooking();
  const added = legs.length === 1 ? "1 flight" : `${legs.length} flights`;
  commit(() => {
    if (booking) legs.forEach((leg) => addLeg(booking, leg));
    else addItinerary(option, legs, parsePrice(draft.price));
  });
  draft = newDraft("new");
  draft.message = `Added ${added} to ${option.name}.`;
  render();
}

// Typing in the paste box and price field.
on(panel, "input", "[data-builder]", (field) => {
  if (field.tagName !== "SELECT") draft[field.dataset.builder] = field.value;
});

on(panel, "change", "select[data-builder]", (select) => {
  if (select.dataset.builder === "option") {
    if (select.value === "new") commit(() => chooseOption(addOption(activeTrip(state)).id));
    else chooseOption(select.value);
    draft = newDraft("new");
  } else {
    draft.bookingId = select.value;
    const booking = chosenBooking();
    const untouched = draft.legs.length === 1 && !draft.legs[0].from;
    if (booking && untouched) draft.legs = [legAfter(booking)];
  }
  render();
});

const actions = {
  fill: fillFromPaste,
  "add-row"() {
    const previous = draft.legs.at(-1);
    draft.legs.push(blankLeg({ from: previous.to, fromTz: previous.toTz }));
  },
  clear() {
    draft = newDraft(draft.bookingId, chosenBooking() ? [legAfter(chosenBooking())] : [blankLeg()]);
  },
};

on(panel, "click", "[data-builder-action]", (button) => {
  actions[button.dataset.builderAction]();
  render();
});

on(panel, "click", "[data-remove-row]", (button) => {
  draft.legs.splice(Number(button.dataset.removeRow), 1);
  render();
});

on(panel, "submit", "form", (form, event) => {
  event.preventDefault();
  save();
});

trackFlightFields(panel, () => draft.legs);
