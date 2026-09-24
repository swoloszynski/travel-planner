// A Google Flights search, written the way someone would type it.
export function googleFlightsUrl({ from, to, depart, returns }) {
  let query = `Flights from ${from.toUpperCase()} to ${to.toUpperCase()}`;
  if (depart) query += ` on ${depart}`;
  if (returns) query += ` returning ${returns}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}
