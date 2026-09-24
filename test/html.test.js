import { test, assertEqual } from "./runner.js";
import { html } from "../src/html.js";

test("html escapes values", () => {
  const name = `"Tom" & Jerry's <b>`;
  assertEqual(String(html`<p>${name}</p>`), "<p>&quot;Tom&quot; &amp; Jerry&#39;s &lt;b&gt;</p>");
});

test("html keeps nested templates and joins lists", () => {
  const items = ["a", "<b>"].map((item) => html`<li>${item}</li>`);
  assertEqual(String(html`<ul>${items}</ul>`), "<ul><li>a</li><li>&lt;b&gt;</li></ul>");
});

test("html leaves out null, undefined and false", () => {
  assertEqual(String(html`<p>${null}${undefined}${false}${0}</p>`), "<p>0</p>");
});
