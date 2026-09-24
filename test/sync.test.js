import { test, assertEqual } from "./runner.js";
import { planSync } from "../src/sync.js";

test("planSync writes a file that doesn't exist yet", () => {
  assertEqual(planSync({ local: "A", file: null, lastWritten: null }), "write");
});

test("planSync does nothing when both sides match", () => {
  assertEqual(planSync({ local: "B", file: "B", lastWritten: "A" }), "none");
});

test("planSync writes when only this browser changed", () => {
  assertEqual(planSync({ local: "B", file: "A", lastWritten: "A" }), "write");
});

test("planSync loads when only the file changed", () => {
  assertEqual(planSync({ local: "A", file: "B", lastWritten: "A" }), "load");
});

test("planSync keeps a backup when both changed", () => {
  assertEqual(planSync({ local: "B", file: "C", lastWritten: "A" }), "load and back up");
});

test("planSync keeps a backup when connecting to a folder that already has different data", () => {
  assertEqual(planSync({ local: "A", file: "B", lastWritten: null }), "load and back up");
});
