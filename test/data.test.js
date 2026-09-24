import { test, assertEqual } from "./runner.js";
import { AIRPORTS, findAirport } from "../src/data/airports.js";

test("findAirport looks up an airport by code", () => {
  assertEqual(findAirport("JFK").tz, "America/New_York");
  assertEqual(findAirport("XXX"), undefined);
});

test("every airport code is listed once", () => {
  const codes = AIRPORTS.map((airport) => airport.code);
  assertEqual(codes.filter((code, i) => codes.indexOf(code) !== i), []);
});
