// Stand-ins for prompt(), confirm() and alert(), using one <dialog>.
import { showDialog } from "./dom.js";

const dialog = document.getElementById("ask");
const title = dialog.querySelector("h2");
const message = dialog.querySelector("p");
const answer = dialog.querySelector("input");
const ok = dialog.querySelector("button[value=ok]");
const cancel = dialog.querySelector("button[data-close]");

async function ask({ heading, text = "", value = null, okLabel = "OK", canCancel = true }) {
  title.textContent = heading;
  message.textContent = text;
  message.hidden = !text;
  answer.hidden = value === null;
  answer.disabled = value === null;
  answer.value = value ?? "";
  ok.textContent = okLabel;
  cancel.hidden = !canCancel;
  const result = showDialog(dialog);
  if (value !== null) answer.select();
  return (await result) === "ok";
}

// Resolves with the trimmed text, or null if cancelled.
export async function askText(heading, value = "") {
  return (await ask({ heading, value })) ? answer.value.trim() : null;
}

export function confirmDelete(heading, text) {
  return ask({ heading, text, okLabel: "Delete" });
}

export async function tell(heading, text) {
  await ask({ heading, text, canCancel: false });
}
