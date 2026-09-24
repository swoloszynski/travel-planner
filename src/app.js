// The app's state, and the one way to change it.
//
// Each part of the page reads `state`, calls `commit` to change it, and
// registers with `onChange` to redraw itself afterward.
import { loadState, saveState } from "./storage.js";

export let state = loadState();

const listeners = [];

export function onChange(listener) {
  listeners.push(listener);
}

export function render() {
  listeners.forEach((listener) => listener());
}

export function commit(change) {
  change(state);
  saveState(state);
  render();
}

export function replaceState(next) {
  state = next;
  commit(() => {});
}
