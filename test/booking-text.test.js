import { test, assertEqual } from "./runner.js";
import { flight } from "./helpers.js";
import { bookingText } from "../src/booking-text.js";
import { parseFlights } from "../src/parse.js";

const toDenver = flight("LGA 2026-10-08 07:15", "DEN 2026-10-08 09:05", { airline: "United", flightNumber: "UA 1432" });
const toSfo = flight("DEN 2026-10-08 10:15", "SFO 2026-10-08 11:45", { airline: "United", flightNumber: "UA 588" });
const home = flight("SFO 2026-10-14 22:30", "JFK 2026-10-15 06:45", { airline: "Alaska" });

test("bookingText writes each flight and the price", () => {
  assertEqual(bookingText({ legs: [toDenver, toSfo], price: 412 }, "USD").split("\n"), [
    "United UA 1432",
    "Depart LGA 2026-10-08 07:15",
    "Arrive DEN 2026-10-08 09:05",
    "United UA 588",
    "Depart DEN 2026-10-08 10:15",
    "Arrive SFO 2026-10-08 11:45",
    "Price: $412.00",
  ]);
});

test("pasting copied flights gives back the same flights and price", () => {
  const booking = { legs: [toDenver, toSfo, home], price: 780.5 };
  assertEqual(parseFlights(bookingText(booking, "USD")), { legs: booking.legs, price: 780.5 });
});

test("bookingText leaves out a price that isn't set", () => {
  assertEqual(parseFlights(bookingText({ legs: [home], price: null }, "USD")), { legs: [home], price: null });
});
