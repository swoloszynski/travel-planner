// Reading the user's own Google Calendar. Sign-in uses Google Identity
// Services, loaded by a script tag in index.html. The access token lasts
// an hour and is kept in sessionStorage; nothing from Google is saved with
// the trips or exported.

const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const TOKEN_KEY = "travel-planner.google-token";

export class SignInExpired extends Error {}

// The token from earlier in this browser session, if it has at least a
// minute left.
export function savedToken() {
  try {
    const token = JSON.parse(sessionStorage.getItem(TOKEN_KEY));
    return token?.expiresAt > Date.now() + 60_000 ? token : null;
  } catch {
    return null;
  }
}

// Opens Google's sign-in popup, so it has to be called from a click.
export function signIn(clientId) {
  if (!window.google?.accounts?.oauth2) {
    return Promise.reject(new Error("Google sign-in hasn't loaded yet. Try again in a moment."));
  }
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback(response) {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        const token = { accessToken: response.access_token, expiresAt: Date.now() + response.expires_in * 1000 };
        sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token));
        resolve(token);
      },
      error_callback(error) {
        reject(new Error(error.type === "popup_closed" ? "The sign-in window was closed." : error.message || error.type));
      },
    });
    client.requestAccessToken({ prompt: "" });
  });
}

export function signOut(token) {
  sessionStorage.removeItem(TOKEN_KEY);
  if (token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(token.accessToken, () => {});
}

async function get(token, path, params = {}) {
  if (token.expiresAt <= Date.now()) throw new SignInExpired();
  const url = new URL(`https://www.googleapis.com/calendar/v3/${path}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token.accessToken}` } });
  if (response.status === 401) throw new SignInExpired();
  if (!response.ok) throw new Error(`Google Calendar request failed (${response.status}).`);
  return response.json();
}

// The user's calendars, their main one first.
export async function listCalendars(token) {
  const data = await get(token, "users/me/calendarList", { maxResults: "250" });
  return (data.items ?? [])
    .map((c) => ({ id: c.id, name: c.summaryOverride || c.summary || c.id, color: c.backgroundColor, primary: !!c.primary }))
    .sort((a, b) => b.primary - a.primary || a.name.localeCompare(b.name));
}

// Events between two ISO times, leaving out cancelled ones and ones the
// user declined. All-day events have a `date`; others a `dateTime`.
export async function listEvents(token, calendarId, timeMin, timeMax) {
  const events = [];
  let pageToken = "";
  do {
    const params = { timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "250" };
    if (pageToken) params.pageToken = pageToken;
    const data = await get(token, `calendars/${encodeURIComponent(calendarId)}/events`, params);
    events.push(...(data.items ?? []));
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);

  const declined = (event) => event.attendees?.some((a) => a.self && a.responseStatus === "declined");
  return events.filter((event) => event.status !== "cancelled" && !declined(event));
}
