// Remembers which sidebar panels are open, in this browser only.

const KEY = "travel-planner.open-panels";

let open = {};
try {
  open = JSON.parse(localStorage.getItem(KEY)) ?? {};
} catch {
  // Start with every panel as the page has it.
}

for (const panel of document.querySelectorAll(".sidebar details")) {
  if (panel.id in open) panel.open = open[panel.id];
  panel.addEventListener("toggle", () => {
    open[panel.id] = panel.open;
    try {
      localStorage.setItem(KEY, JSON.stringify(open));
    } catch {
      // Not saving is fine; the panel still works.
    }
  });
}
