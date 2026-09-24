// Small helpers for working with the page.

// Runs `handler` for events on elements inside `root` that match
// `selector`, including elements drawn after this is called.
export function on(root, type, selector, handler) {
  root.addEventListener(type, (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(target, event);
  });
}

// Replaces an element's contents. If something inside had focus, focuses
// its replacement: the element with the same data attributes.
export function redraw(element, content) {
  const focused = element.contains(document.activeElement) ? document.activeElement.dataset : {};
  element.innerHTML = content;
  const selector = Object.entries(focused)
    .map(([key, value]) => `[data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}="${CSS.escape(value)}"]`)
    .join("");
  if (selector) element.querySelector(selector)?.focus();
}

// For buttons that delete something. The first click changes the label to
// the button's data-confirm text and returns false; a second click within
// a few seconds returns true.
const labels = new WeakMap();

export function confirmed(button) {
  if (labels.has(button)) {
    disarm(button);
    return true;
  }
  labels.set(button, button.textContent);
  button.textContent = button.dataset.confirm;
  setTimeout(() => disarm(button), 4000);
  return false;
}

function disarm(button) {
  if (!labels.has(button)) return;
  button.textContent = labels.get(button);
  labels.delete(button);
}
