import { findAirport } from "../src/data/airports.js";

// Builds a leg from "JFK 2026-10-05 06:00"-style departure and arrival text.
export function flight(departure, arrival, details = {}) {
  const [from, departDate, departTime] = departure.split(" ");
  const [to, arriveDate, arriveTime] = arrival.split(" ");
  return {
    airline: "",
    flightNumber: "",
    from,
    fromTz: findAirport(from).tz,
    departs: `${departDate}T${departTime}`,
    to,
    toTz: findAirport(to).tz,
    arrives: `${arriveDate}T${arriveTime}`,
    ...details,
  };
}
