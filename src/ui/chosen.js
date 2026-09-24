// The option being looked at: shown in the right-hand panel and picked in
// the Add flights panel. Not saved.
import { state } from "../app.js";
import { activeTrip } from "../state.js";

let chosenId = null;

// Callers redraw the page afterward, or call this inside a commit.
export function chooseOption(id) {
  chosenId = id;
}

// Falls back to the first option with flights, then the first option.
export function chosenOption() {
  const { options } = activeTrip(state);
  return options.find((o) => o.id === chosenId) ?? options.find((o) => o.itineraries.length) ?? options[0];
}
