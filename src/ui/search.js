// Opens a Google Flights search in a new tab.
import { googleFlightsUrl } from "../google-flights.js";

const form = document.getElementById("search-form");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const search = Object.fromEntries(new FormData(form));
  window.open(googleFlightsUrl(search), "_blank", "noopener");
});
