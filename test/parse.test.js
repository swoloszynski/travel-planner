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
  "time-then-code",
  "unknown-arrival-airport",
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

test("parseFlights doesn't read a line starting with a weekday name as a date", () => {
  const text = "Fri, Nov 6\nSun Country\n6:00 AM – 7:55 AM\nMSP–LAS\n$120";
  assertEqual(parseFlights(text, today).legs.map((leg) => [leg.airline, leg.departs]), [
    ["Sun Country", "2026-11-06T06:00"],
  ]);
});
