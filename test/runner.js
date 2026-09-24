// A small test runner for the browser. Open test/index.html to run it.

const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function assertEqual(actual, expected) {
  const a = stringify(actual);
  const e = stringify(expected);
  if (a !== e) throw new Error(`Expected:\n${e}\n\nActual:\n${a}`);
}

export async function readFixture(path) {
  const response = await fetch(new URL(`fixtures/${path}`, import.meta.url));
  if (!response.ok) throw new Error(`Missing fixture: ${path}`);
  return response.text();
}

// JSON with object keys sorted, so key order doesn't affect equality.
function stringify(value) {
  return JSON.stringify(
    value,
    (key, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v),
    2
  );
}

export async function run() {
  const list = document.getElementById("results");
  let failed = 0;

  for (const { name, fn } of tests) {
    const item = document.createElement("li");
    item.textContent = name;
    try {
      await fn();
      item.className = "pass";
    } catch (error) {
      failed++;
      item.className = "fail";
      const details = document.createElement("pre");
      details.textContent = error.message;
      item.append(details);
    }
    list.append(item);
  }

  document.getElementById("summary").textContent = failed
    ? `${failed} of ${tests.length} failed`
    : `All ${tests.length} passed`;
  document.title = failed ? "Tests: FAIL" : "Tests: PASS";
}
