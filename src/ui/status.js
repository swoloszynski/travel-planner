// A short message in the top bar, cleared after a few seconds.

const status = document.getElementById("status");

let clearing;

export function say(message) {
  status.textContent = message;
  clearTimeout(clearing);
  clearing = setTimeout(() => (status.textContent = ""), 8000);
}
