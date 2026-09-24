import { test, assertEqual } from "./runner.js";
import { findTimezone, timezoneLabel } from "../src/timezones.js";

test("findTimezone accepts IANA names in any case", () => {
  assertEqual(findTimezone("America/Chicago"), "America/Chicago");
  assertEqual(findTimezone("america/chicago"), "America/Chicago");
  assertEqual(findTimezone("utc"), "UTC");
});

test("findTimezone accepts a city", () => {
  assertEqual(findTimezone("new york"), "America/New_York");
  assertEqual(findTimezone("Tokyo"), "Asia/Tokyo");
  assertEqual(findTimezone("Los_Angeles"), "America/Los_Angeles");
});

test("findTimezone accepts common abbreviations", () => {
  assertEqual(findTimezone("PST"), "America/Los_Angeles");
  assertEqual(findTimezone("et"), "America/New_York");
});

test("findTimezone returns null for anything else", () => {
  assertEqual(findTimezone("Narnia"), null);
  assertEqual(findTimezone(""), null);
});

test("timezoneLabel names the city and its current offset", () => {
  assertEqual(timezoneLabel("Asia/Tokyo"), "Tokyo · UTC+9");
  assertEqual(timezoneLabel("UTC"), "UTC");
});
