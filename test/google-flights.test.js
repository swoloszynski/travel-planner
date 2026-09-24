import { test, assertEqual } from "./runner.js";
import { googleFlightsUrl } from "../src/google-flights.js";

test("googleFlightsUrl searches one way", () => {
  assertEqual(
    googleFlightsUrl({ from: "jfk", to: "lax", depart: "2026-10-05", returns: "" }),
    "https://www.google.com/travel/flights?q=Flights%20from%20JFK%20to%20LAX%20on%202026-10-05"
  );
});

test("googleFlightsUrl adds a return date", () => {
  const url = googleFlightsUrl({ from: "JFK", to: "LAX", depart: "2026-10-05", returns: "2026-10-12" });
  assertEqual(decodeURIComponent(url.split("q=")[1]), "Flights from JFK to LAX on 2026-10-05 returning 2026-10-12");
});
