# Travel Planner

Compare flight options for a trip on a calendar.

Plain HTML, CSS and JavaScript modules. There is no build step and nothing to install.

## Run

```bash
python3 serve.py
```

Open http://localhost:5173.

## Test

With the server running, open http://localhost:5173/test/.

To add a paste case, see [test/fixtures/paste/README.md](test/fixtures/paste/README.md).

## Layout

- `src/model.js`, `sleep.js`, `describe.js`, `events.js` and `parse.js` hold the rules about flights. They don't touch the page, and `test/` covers them.
- `src/state.js` is the saved data and the edits made to it. `src/app.js` holds the current state; each part of the page changes it through `commit` and redraws in `onChange`.
- `src/calendar.js` and `src/ui/` each draw and handle one part of the page. `src/main.js` loads them.
- `styles.css` styles the whole page; there is no CSS framework.
