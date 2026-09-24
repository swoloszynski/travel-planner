import { test, assertEqual } from "./runner.js";
import { formatDuration, formatPrice, parsePrice, isCurrency, isTimezone } from "../src/format.js";

test("formatDuration shows hours and minutes", () => {
  assertEqual(formatDuration(392), "6h 32m");
  assertEqual(formatDuration(120), "2h");
  assertEqual(formatDuration(45), "45m");
});

test("parsePrice reads amounts with symbols and commas", () => {
  assertEqual(parsePrice("$1,204.50"), 1204.5);
  assertEqual(parsePrice("289"), 289);
});

test("parsePrice treats blank text as no price", () => {
  assertEqual(parsePrice(""), null);
  assertEqual(parsePrice("  "), null);
  assertEqual(parsePrice(undefined), null);
});

test("isCurrency accepts ISO codes only", () => {
  assertEqual(isCurrency("EUR"), true);
  assertEqual(isCurrency("DOLLARS"), false);
});

test("formatPrice falls back to a plain number for an unknown currency", () => {
  assertEqual(formatPrice(289, "DOLLARS"), "289.00");
});

test("isTimezone accepts IANA zone names only", () => {
  assertEqual(isTimezone("Asia/Tokyo"), true);
  assertEqual(isTimezone("Tokyo"), false);
  assertEqual(isTimezone(""), false);
});
