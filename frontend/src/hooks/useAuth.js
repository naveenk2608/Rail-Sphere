function getToken() {
  return localStorage.getItem("token");
}

// JWT segments are base64url-encoded UTF-8. atob() only accepts standard
// base64 and returns raw bytes, so decoding with it alone throws on '-' or
// '_' and garbles any non-ASCII name (e.g. Telugu or Hindi script).
function decodePayload(token) {
  const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function getUserFromToken() {
  const token = getToken();
  if (!token) return null;

  try {
    const payload = decodePayload(token);

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      return null;
    }

    const name = payload.name || "User";
    const initials = name
      .split(" ")
      .filter(Boolean)
      .map((w) => [...w][0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return { name, email: payload.email || "", initials };
  } catch {
    localStorage.removeItem("token");
    return null;
  }
}

// Where to go after login or signup. A booking interrupted by the login
// wall wins over the returnTo query, but only while it is fresh: an
// abandoned booking must not hijack a login hours later.
const PROGRESS_KEY = "bookingProgress";
const PROGRESS_TTL_MS = 30 * 60 * 1000;

function isSafePath(path) {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

export function saveBookingProgress(returnPath) {
  try {
    sessionStorage.setItem(PROGRESS_KEY, JSON.stringify({ returnPath, savedAt: Date.now() }));
  } catch {
    // Storage unavailable: the user simply lands on returnTo instead.
  }
}

export function consumeReturnPath(returnTo) {
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(PROGRESS_KEY));
    sessionStorage.removeItem(PROGRESS_KEY);
  } catch {
    saved = null;
  }
  if (saved && Date.now() - saved.savedAt < PROGRESS_TTL_MS && isSafePath(saved.returnPath))
    return saved.returnPath;
  return isSafePath(returnTo) ? returnTo : "/";
}
