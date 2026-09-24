// Small helpers for working with the page.

// Runs `handler` for events on elements inside `root` that match
// `selector`, including elements drawn after this is called.
export function on(root, type, selector, handler) {
  root.addEventListener(type, (event) => {
    const target = event.target.closest(selector);
    if (target && root.contains(target)) handler(target, event);
  });
}

// Opens a <dialog> and waits for it to close. Resolves with the value of
// the submit button that closed it, or "" if it was cancelled.
export function showDialog(dialog) {
  dialog.returnValue = "";
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue), { once: true });
  });
}

// Buttons marked data-close cancel the dialog they're in.
on(document, "click", "dialog [data-close]", (button) => button.closest("dialog").close());

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
