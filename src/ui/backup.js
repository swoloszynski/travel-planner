// Saving everything to a file, and loading it back.
import { DateTime } from "luxon";
import { state, replaceState } from "../app.js";
import { restoreState } from "../state.js";
import { applySettings, goToTripStart } from "../calendar.js";
import { confirmed } from "./dom.js";

const fileInput = document.getElementById("import-file");
const status = document.getElementById("backup-status");

let clearStatus;
function say(message) {
  status.textContent = message;
  clearTimeout(clearStatus);
  clearStatus = setTimeout(() => (status.textContent = ""), 8000);
}

document.getElementById("export").addEventListener("click", () => {
  const file = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = `travel-planner-${DateTime.now().toISODate()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

// Importing replaces everything, so the button asks first.
document.getElementById("import").addEventListener("click", (event) => {
  if (confirmed(event.currentTarget)) fileInput.click();
});

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  fileInput.value = "";
  if (!file) return;

  let imported = null;
  try {
    imported = restoreState(JSON.parse(await file.text()));
  } catch {
    // Not JSON; handled below.
  }
  if (!imported) {
    say(`${file.name} isn't a file exported from this version of Travel Planner.`);
    return;
  }

  replaceState(imported);
  const count = imported.trips.length;
  say(`Imported ${count === 1 ? "1 trip" : `${count} trips`} from ${file.name}.`);
  applySettings();
  goToTripStart();
});
