# Travel Planner

Compare flight options for a trip on a calendar.

Use it at https://swoloszynski.github.io/travel-planner/.

Plain HTML, CSS and JavaScript modules. There is no build step and nothing to install.

## Run

```bash
python3 serve.py
```

Open http://localhost:5173. Google Calendar sign-in only works from web addresses allowed on the OAuth client ID, such as this one and the GitHub Pages address.

## Storage

Trips are saved in the browser's localStorage. In Chrome, Edge or Arc you can
also choose a folder in Settings, and the app keeps `travel-planner.json` there
in step with the browser: it saves each change, and loads changes made on
another computer when the page opens or comes back to the front. If both sides
changed, it loads the file and saves the browser's version beside it as a
dated backup.

## Test

With the server running, open http://localhost:5173/test/.

To add a paste case, see [test/fixtures/paste/README.md](test/fixtures/paste/README.md).

## Layout

- `src/model.js`, `sleep.js`, `describe.js`, `events.js` and `parse.js` hold the rules about flights. They don't touch the page, and `test/` covers them.
- `src/folder.js` and `src/sync.js` keep a file on disk in step with the browser.
- `src/state.js` is the saved data and the edits made to it. `src/app.js` holds the current state; each part of the page changes it through `commit` and redraws in `onChange`.
- `src/calendar.js` and `src/ui/` each draw and handle one part of the page. `src/main.js` loads them.
- `styles.css` styles the whole page; there is no CSS framework.
