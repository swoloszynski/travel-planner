import { test, assertEqual } from "./runner.js";
import { flight } from "./helpers.js";
import { sleepMinutes } from "../src/sleep.js";

const sleep = {
  sleepEnabled: true,
  sleepStart: "23:00",
  sleepEnd: "07:00",
  sleepTz: "America/New_York",
};
const noBuffers = { ...sleep, minutesToAirport: 0, minutesAtAirport: 0, minutesFromAirport: 0 };
const withBuffers = { ...sleep, minutesToAirport: 45, minutesAtAirport: 120, minutesFromAirport: 30 };

// Leaves at 1:30am New York time, lands at 6:45am.
const redEye = flight("LAX 2026-10-10 22:30", "JFK 2026-10-11 06:45");

test("sleepMinutes counts flight time inside usual sleep hours", () => {
  assertEqual(sleepMinutes([redEye], noBuffers), 5 * 60 + 15);
});

test("sleepMinutes includes getting to and from the airport", () => {
  assertEqual(sleepMinutes([redEye], withBuffers), 8 * 60);
});

test("sleepMinutes is zero for a daytime flight", () => {
  const daytime = flight("JFK 2026-10-05 11:00", "LAX 2026-10-05 14:30");
  assertEqual(sleepMinutes([daytime], withBuffers), 0);
});

test("sleepMinutes is zero when sleep hours are turned off", () => {
  assertEqual(sleepMinutes([redEye], { ...withBuffers, sleepEnabled: false }), 0);
});

test("sleepMinutes counts each direction on its own", () => {
  // The week between these two red-eyes isn't travel time.
  const home = flight("JFK 2026-10-17 01:00", "LAX 2026-10-17 04:00");
  assertEqual(sleepMinutes([redEye, home], noBuffers), 5 * 60 + 15 + 6 * 60);
});
