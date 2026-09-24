// Saving everything to a file, and loading it back.
import { DateTime } from "luxon";
import { state, replaceState } from "../app.js";
import { restoreState } from "../state.js";
import { applySettings, goToTripStart } from "../calendar.js";
import { confirmAction, tell } from "./ask.js";

const fileInput = document.getElementById("import-file");

document.getElementById("export").addEventListener("click", () => {
  const file = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = `travel-planner-${DateTime.now().toISODate()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});

document.getElementById("import").addEventListener("click", () => fileInput.click());

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
    await tell("Couldn't import that file", "It isn't a file exported from this version of Travel Planner.");
    return;
  }

  const count = imported.trips.length;
  const replace = await confirmAction(
    "Replace everything?",
    `This replaces all your trips and settings with the ${count === 1 ? "trip" : `${count} trips`} in ${file.name}.`,
    "Replace"
  );
  if (!replace) return;
  replaceState(imported);
  applySettings();
  goToTripStart();
});
