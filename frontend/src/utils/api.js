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
  const res  = await fetch(BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  // Auth
  register: (body)           => request("POST", "/auth/register", body),
  login:    (body)           => request("POST", "/auth/login", body),

  // Stations
  searchStations: (q)        => request("GET", `/stations/search?q=${encodeURIComponent(q)}`),

  // Trains
  searchTrains: (p)          => request("GET",
    `/trains/search?fromId=${p.fromId}&toId=${p.toId}&date=${p.date}&class=${p.cls || "ALL"}`),
  getCoaches:   (trainId, cls) => request("GET", `/trains/${trainId}/coaches?class=${cls}`),
  getBookedSeats: (trainId, coachId, date, fromSeq, toSeq) =>
    request("GET", `/trains/${trainId}/seats?coachId=${coachId}&date=${date}&fromSeq=${fromSeq}&toSeq=${toSeq}`),
  getTrainRoute: (trainId)   => request("GET", `/trains/${trainId}/route`),
  getFare: (distance, cls, passengers) =>
    request("GET", `/trains/fare?distance=${distance}&class=${cls}&passengers=${passengers}`),

  // Bookings
  createBooking:  (body)     => request("POST", "/bookings", body),
  getMyBookings:  ()         => request("GET",  "/bookings/my"),
  getBookingById: (id)       => request("GET",  `/bookings/${id}`),
  getByPNR:       (pnr)      => request("GET",  `/bookings/pnr/${pnr}`),
  cancelBooking:  (id)       => request("PATCH", `/bookings/${id}/cancel`),
  emailTicket:    (id)       => request("POST",  `/bookings/${id}/email`),

  // Saved passengers
  getSavedPassengers:    ()   => request("GET",    "/passengers/saved"),
  addSavedPassenger:     (b)  => request("POST",   "/passengers/saved", b),
  deleteSavedPassenger:  (id) => request("DELETE", `/passengers/saved/${id}`),
};