import { test, assertEqual } from "./runner.js";
import { loadState, saveState } from "../src/storage.js";
import { activeTrip, addTrip, createState } from "../src/state.js";

// Stands in for localStorage.
function memoryStorage() {
  const items = new Map();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
  };
}

test("saved state loads back the same", () => {
  const storage = memoryStorage();
  const state = createState();
  addTrip(state, "Tokyo");
  saveState(state, storage);
  assertEqual(loadState(storage), state);
});

test("loadState starts fresh when nothing is saved", () => {
  assertEqual(activeTrip(loadState(memoryStorage())).name, "My trip");
});

test("loadState starts fresh when saved data is unreadable", () => {
  const storage = memoryStorage();
  storage.setItem("travel-planner", "{not json");
  assertEqual(activeTrip(loadState(storage)).name, "My trip");
});
