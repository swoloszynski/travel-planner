// Saving to a folder on disk as well as in the browser. The folder holds
// travel-planner.json, the same file Export makes, so it can be backed up,
// kept in iCloud Drive or Dropbox, and opened on another computer.
//
// Only Chromium browsers (Chrome, Edge, Arc) have the folder picker this
// needs. Elsewhere the status is "unsupported".
//
//   unsupported  this browser has no folder picker
//   off          no folder chosen
//   ready        chosen and allowed; files can be read and written
//   blocked      chosen, but the browser wants permission again. This is
//                normal after a reload: Chrome won't give write access back
//                without a click.

export const FILE_NAME = "travel-planner.json";

let folder = null;
let lastWritten = null;
let state = "off";

export function status() {
  return { state, name: folder?.name ?? "" };
}

// The text last written to the file or read from it, to tell which side
// changed. See sync.js.
export function lastWrittenText() {
  return lastWritten;
}

export async function setLastWritten(text) {
  lastWritten = text;
  await remember();
}

// Picks up the folder chosen on an earlier visit. Never asks for anything.
export async function resume() {
  if (!(typeof window.showDirectoryPicker === "function" && window.isSecureContext)) {
    state = "unsupported";
    return;
  }
  try {
    const saved = await load();
    if (!saved) return;
    ({ folder, lastWritten } = saved);
    state = (await folder.queryPermission({ mode: "readwrite" })) === "granted" ? "ready" : "blocked";
  } catch (error) {
    // The folder was deleted or its disk isn't mounted.
    console.warn("Couldn't pick up the saved folder.", error);
    await forget();
  }
}

// Opens the folder picker, so it has to be called from a click.
export async function choose() {
  folder = await window.showDirectoryPicker({ id: "travel-planner", mode: "readwrite", startIn: "documents" });
  lastWritten = null;
  state = "ready";
  await remember();
}

// Asks for the chosen folder again by opening the picker on it. Asking with
// requestPermission instead makes Chrome list every folder this site was
// ever given, including ones it has since stopped using.
export async function reconnect() {
  const picked = await window.showDirectoryPicker({ id: "travel-planner", mode: "readwrite", startIn: folder });
  if (!(await folder.isSameEntry(picked))) lastWritten = null;
  folder = picked;
  let access = await picked.queryPermission({ mode: "readwrite" });
  if (access !== "granted") access = await picked.requestPermission({ mode: "readwrite" });
  state = access === "granted" ? "ready" : "blocked";
  await remember();
}

export async function forget() {
  folder = null;
  lastWritten = null;
  state = "off";
  await remember();
}

// The file's text, or null if it doesn't exist yet.
export async function readFile() {
  try {
    const handle = await folder.getFileHandle(FILE_NAME);
    return await (await handle.getFile()).text();
  } catch (error) {
    if (error.name === "NotFoundError") return null;
    throw blockedOn(error);
  }
}

// createWritable writes to a scratch file and swaps it in on close, so a
// failed write leaves the previous file whole.
export async function writeFile(text, name = FILE_NAME) {
  try {
    const handle = await folder.getFileHandle(name, { create: true });
    const out = await handle.createWritable();
    await out.write(text);
    await out.close();
  } catch (error) {
    throw blockedOn(error);
  }
}

function blockedOn(error) {
  if (error.name === "NotAllowedError") state = "blocked";
  return error;
}

// The folder handle is kept in IndexedDB, since a handle can't be stored as
// JSON in localStorage.

function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("travel-planner", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("folder");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, use) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("folder", mode);
    const request = use(transaction.objectStore("folder"));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
  });
}

function load() {
  return withStore("readonly", (store) => store.get("saved"));
}

function remember() {
  return withStore("readwrite", (store) =>
    folder ? store.put({ folder, lastWritten }, "saved") : store.delete("saved")
  );
}
