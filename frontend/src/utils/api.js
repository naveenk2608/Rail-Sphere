const BASE = import.meta.env.VITE_API_URL;

function getToken() {
  return localStorage.getItem("token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(BASE + path, opts);

  // A gateway error or cold-start page is HTML, not JSON — don't let the
  // parse failure surface as an unrelated SyntaxError.
  let data;
  try {
    data = await res.json();
  } catch {
    if (!res.ok) throw new Error(`Server error (${res.status}). Please try again.`);
    throw new Error("Unexpected response from server.");
  }

  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  register: (body) => request("POST", "/auth/register", body),
  login:    (body) => request("POST", "/auth/login", body),

  searchStations: (q) => request("GET", `/stations/search?q=${encodeURIComponent(q)}`),

  getClasses: () => request("GET", "/trains/classes"),
  searchTrains: (p) =>
    request("GET",
      `/trains/search?fromId=${encodeURIComponent(p.fromId)}&toId=${encodeURIComponent(p.toId)}` +
      `&date=${encodeURIComponent(p.date)}&class=${encodeURIComponent(p.cls || "ALL")}`),
  getCoaches: (trainId, cls) =>
    request("GET", `/trains/${trainId}/coaches?class=${encodeURIComponent(cls)}`),
  getBookedSeats: (trainId, coachId, date, fromSeq, toSeq) =>
    request("GET",
      `/trains/${trainId}/seats?coachId=${encodeURIComponent(coachId)}&date=${encodeURIComponent(date)}` +
      `&fromSeq=${encodeURIComponent(fromSeq)}&toSeq=${encodeURIComponent(toSeq)}`),
  getTrainRoute: (trainId) => request("GET", `/trains/${trainId}/route`),
  getFare: (distance, cls, passengers) =>
    request("GET",
      `/trains/fare?distance=${encodeURIComponent(distance)}&class=${encodeURIComponent(cls)}` +
      `&passengers=${encodeURIComponent(passengers)}`),

  createBooking:  (body) => request("POST",  "/bookings", body),
  getMyBookings:  ()     => request("GET",   "/bookings/my"),
  getBookingById: (id)   => request("GET",   `/bookings/${id}`),
  getByPNR:       (pnr)  => request("GET",   `/bookings/pnr/${encodeURIComponent(pnr)}`),
  cancelBooking:  (id)   => request("PATCH", `/bookings/${id}/cancel`),
  emailTicket:    (id)   => request("POST",  `/bookings/${id}/email`),

  getSavedPassengers: () => request("GET", "/passengers/saved"),
};
