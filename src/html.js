// Builds HTML from a template literal. Every value is escaped unless it is
// itself built with `html`, so nested templates and lists work as-is:
//
//   html`<ul>${names.map((name) => html`<li>${name}</li>`)}</ul>`

class Html {
  constructor(text) {
    this.text = text;
  }

  toString() {
    return this.text;
  }
}

export function html(strings, ...values) {
  return new Html(strings.reduce((out, string, i) => out + toHtml(values[i - 1]) + string));
}

function toHtml(value) {
  if (value instanceof Html) return value.text;
  if (Array.isArray(value)) return value.map(toHtml).join("");
  if (value == null || value === false) return "";
  return escape(String(value));
}

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escape(text) {
  return text.replace(/[&<>"']/g, (c) => ENTITIES[c]);
}
