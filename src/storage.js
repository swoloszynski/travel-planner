// Keeps the state in the browser's localStorage.
import { createState, restoreState } from "./state.js";

const KEY = "travel-planner";

export function loadState(storage = localStorage) {
  try {
    return restoreState(JSON.parse(storage.getItem(KEY))) ?? createState();
  } catch (error) {
    console.error("Couldn't read saved data. Starting fresh.", error);
    return createState();
  }
}

export function saveState(state, storage = localStorage) {
  storage.setItem(KEY, JSON.stringify(state));
}
