// The Storage section of settings, and keeping the folder's file in step
// with this browser's data. See folder.js and sync.js.
import { DateTime } from "luxon";
import { state, onChange, replaceState } from "../app.js";
import { restoreState } from "../state.js";
import { applySettings, goToTripStart } from "../calendar.js";
import * as Folder from "../folder.js";
import { planSync } from "../sync.js";
import { confirmed } from "./dom.js";
import { say } from "./status.js";

const note = document.getElementById("folder-status");
const chooseButton = document.getElementById("folder-choose");
const stopButton = document.getElementById("folder-stop");
const reconnectButton = document.getElementById("folder-reconnect");

function draw() {
  const { state: folderState, name } = Folder.status();
  chooseButton.hidden = folderState === "unsupported";
  stopButton.hidden = folderState === "off" || folderState === "unsupported";
  reconnectButton.hidden = folderState !== "blocked";
  reconnectButton.textContent = `Reconnect “${name}”`;

  if (folderState === "unsupported") {
    note.textContent =
      "Trips are saved in this browser only. To also save them to a file on your computer, " +
      "open this page in Chrome, Edge or Arc.";
  } else if (folderState === "off") {
    chooseButton.textContent = "Choose a folder…";
    note.textContent =
      "Trips are saved in this browser only, so clearing its site data would erase them. " +
      `Choose a folder to also save them to ${Folder.FILE_NAME} there. A folder in iCloud Drive ` +
      "or Dropbox keeps a copy you can open on another computer.";
  } else if (folderState === "blocked") {
    chooseButton.textContent = `Reconnect “${name}”`;
    note.textContent =
      `Saving to “${name}” is paused until you allow it again. Chrome asks after each reload.`;
  } else {
    chooseButton.textContent = "Choose a different folder…";
    note.textContent = `Also saving to ${Folder.FILE_NAME} in “${name}”.`;
  }
}

// Compact JSON, so formatting doesn't count as a change.
const compact = (text) => JSON.stringify(JSON.parse(text));
const pretty = (text) => JSON.stringify(JSON.parse(text), null, 2);

// Reads the file, compares, and writes or loads. Every save goes through
// here rather than writing blindly, so a change made on another computer
// is never written over.
let syncing = false;

async function sync() {
  if (Folder.status().state !== "ready" || syncing) return;
  syncing = true;
  try {
    await syncOnce();
  } catch (error) {
    console.warn("Couldn't sync with the folder.", error);
    say(`Couldn't save to the folder: ${error.message}`);
  } finally {
    syncing = false;
    draw();
  }
}

async function syncOnce() {
  const { name } = Folder.status();
  const fileText = await Folder.readFile();
  const local = JSON.stringify(state);
  let file = null;
  if (fileText !== null) {
    try {
      file = compact(fileText);
    } catch {
      return stopOver(`${Folder.FILE_NAME} in “${name}” isn't readable`);
    }
  }

  const plan = planSync({ local, file, lastWritten: Folder.lastWrittenText() });
  if (plan === "none") {
    if (Folder.lastWrittenText() !== local) await Folder.setLastWritten(local);
    return;
  }
  if (plan === "write") {
    await Folder.writeFile(pretty(local));
    await Folder.setLastWritten(local);
    return;
  }

  const loaded = restoreState(JSON.parse(file));
  if (!loaded) return stopOver(`${Folder.FILE_NAME} in “${name}” isn't from this version of Travel Planner`);

  if (plan === "load and back up") {
    const backup = `travel-planner-backup-${DateTime.now().toFormat("yyyy-MM-dd-HHmm")}.json`;
    await Folder.writeFile(pretty(local), backup);
    say(`Loaded ${Folder.FILE_NAME}, which had changed elsewhere. This browser's version is saved as ${backup}.`);
  } else {
    say(`Loaded changes from ${Folder.FILE_NAME}.`);
  }
  await Folder.setLastWritten(file);
  replaceState(loaded);
  applySettings();
  goToTripStart();
}

// A file this app can't read is left alone rather than written over.
async function stopOver(problem) {
  await Folder.forget();
  say(`${problem}, so it was left alone and saving to the folder stopped.`);
}

// Saves a couple of seconds after the last change. Redraws that don't
// change anything find nothing to write.
let timer;
onChange(() => {
  draw();
  clearTimeout(timer);
  timer = setTimeout(sync, 2000);
});

// Another computer may have changed the file while this window was away.
let lastLook = 0;
window.addEventListener("focus", () => {
  if (Date.now() - lastLook < 5000) return;
  lastLook = Date.now();
  sync();
});

async function connect(pick) {
  try {
    await pick();
  } catch (error) {
    // Closing the picker isn't an error.
    if (error.name !== "AbortError") say(`Couldn't open that folder: ${error.message}`);
    return;
  }
  draw();
  // Said first, so anything sync finds replaces it.
  if (Folder.status().state === "ready") say(`Saving to ${Folder.FILE_NAME} in “${Folder.status().name}”.`);
  await sync();
}

chooseButton.addEventListener("click", () =>
  connect(Folder.status().state === "blocked" ? Folder.reconnect : Folder.choose)
);

reconnectButton.addEventListener("click", () => connect(Folder.reconnect));

stopButton.addEventListener("click", async () => {
  if (!confirmed(stopButton)) return;
  await Folder.forget();
  draw();
  say(`Stopped saving to the folder. ${Folder.FILE_NAME} is still there.`);
});

Folder.resume().then(() => {
  draw();
  sync();
});
