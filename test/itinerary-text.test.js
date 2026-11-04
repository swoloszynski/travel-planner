import { test, assertEqual } from "./runner.js";
import { flight } from "./helpers.js";
import { itineraryText } from "../src/itinerary-text.js";

const delta = { airline: "Delta", flightNumber: "DL 123" };

const settings = {
  currency: "USD",
  minutesToAirport: 45,
  minutesAtAirport: 120,
  minutesFromAirport: 30,
  itineraryLeaveTime: false,
  itineraryPrice: false,
};

const roundTrip = {
  itineraries: [
    { price: 300, legs: [flight("LAX 2026-10-14 08:00", "JFK 2026-10-14 16:30", delta)] },
    { price: 200, legs: [flight("JFK 2026-10-05 06:00", "LAX 2026-10-05 09:30")] },
  ],
};

test("itineraryText lists each direction under its date, in travel order", () => {
  assertEqual(
    itineraryText(roundTrip, settings),
    [
      "Mon, Oct 5\nJFK 6:00 AM → LAX 9:30 AM",
      "Wed, Oct 14\nDelta DL 123\nLAX 8:00 AM → JFK 4:30 PM",
    ].join("\n\n")
  );
});

test("itineraryText shows a connection across bookings as a layover", () => {
  const option = {
    itineraries: [
      { price: 120, legs: [flight("LGA 2026-10-08 07:15", "DEN 2026-10-08 09:05")] },
      { price: 90, legs: [flight("DEN 2026-10-08 10:15", "SFO 2026-10-08 11:45")] },
    ],
  };
  assertEqual(
    itineraryText(option, { ...settings, itineraryLeaveTime: true }),
    [
      "Thu, Oct 8\nLeave for LGA at 4:30 AM\nLGA 7:15 AM → DEN 9:05 AM\n1h 10m layover in DEN\nDEN 10:15 AM → SFO 11:45 AM",
    ].join("\n\n")
  );
});

test("itineraryText adds the date when a flight lands or leaves on a later day", () => {
  const option = {
    itineraries: [
      {
        price: null,
        legs: [
          flight("SFO 2026-10-14 22:30", "JFK 2026-10-15 06:45"),
          flight("JFK 2026-10-15 22:00", "LHR 2026-10-16 10:00"),
        ],
      },
    ],
  };
  assertEqual(
    itineraryText(option, settings),
    [
      "Wed, Oct 14\n" +
        "SFO 10:30 PM → JFK 6:45 AM (Thu, Oct 15)\n" +
        "15h 15m layover in JFK\n" +
        "JFK 10:00 PM → LHR 10:00 AM (Fri, Oct 16)",
    ].join("\n\n")
  );
});

test("itineraryText can include the time to leave for each direction", () => {
  assertEqual(
    itineraryText(roundTrip, { ...settings, itineraryLeaveTime: true }),
    [
      "Mon, Oct 5\nLeave for JFK at 3:15 AM\nJFK 6:00 AM → LAX 9:30 AM",
      "Wed, Oct 14\nLeave for LAX at 5:15 AM\nDelta DL 123\nLAX 8:00 AM → JFK 4:30 PM",
    ].join("\n\n")
  );
});

test("itineraryText dates a time to leave that falls the day before the flight", () => {
  const option = { itineraries: [{ price: null, legs: [flight("JFK 2026-10-05 01:00", "LAX 2026-10-05 04:30")] }] };
  assertEqual(
    itineraryText(option, { ...settings, itineraryLeaveTime: true }),
    "Mon, Oct 5\nLeave for JFK at 10:15 PM (Sun, Oct 4)\nJFK 1:00 AM (Mon, Oct 5) → LAX 4:30 AM"
  );
});

test("itineraryText can include the total price", () => {
  const withPrice = { ...settings, itineraryPrice: true };
  const lastLine = (option) => itineraryText(option, withPrice).split("\n").at(-1);
  assertEqual(lastLine(roundTrip), "Price: $500.00");

  const [booked, unpriced] = roundTrip.itineraries;
  assertEqual(lastLine({ itineraries: [booked, { ...unpriced, price: null }] }), "Price: $300.00 + 1 unpriced");
  assertEqual(
    lastLine({ itineraries: [{ ...booked, price: null }] }),
    "LAX 8:00 AM → JFK 4:30 PM"
  );
});
