import { test, assertEqual, readFixture } from "./runner.js";
import { parseFlights } from "../src/parse.js";

const today = "2026-09-24";

const fixtures = [
  "summary",
  "details",
  "connection",
  "round-trip",
  "red-eye",
  "date-line",
  "next-year",
  "unknown-airport",
  "depart-arrive",
];

for (const name of fixtures) {
  test(`parseFlights reads paste/${name}.txt`, async () => {
    const text = await readFixture(`paste/${name}.txt`);
    const expected = JSON.parse(await readFixture(`paste/${name}.json`));
    assertEqual(parseFlights(text, today), expected);
  });
}

test("parseFlights finds nothing in unrelated text", () => {
  assertEqual(parseFlights("Remember to pack a charger", today), { legs: [], price: null });
});
