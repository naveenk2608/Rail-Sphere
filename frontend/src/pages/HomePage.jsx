import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SearchBox from "../components/SearchBox";
import { getUserFromToken } from "../hooks/useAuth";
import { useClassConfig } from "../hooks/useClassConfig";
import { api } from "../utils/api";
import { formatDate, formatTime, departureDateTime, dayShift, stopDate, toDateString } from "../utils/dates";
import { classDisplay } from "../utils/fareCalculator";
import "./HomePage.css";

// Only the station pair lives here. Fares, timings and availability come
// from a live search, so the cards can't drift from the timetable.
const POPULAR = [
  { from: "BZA",  to: "VSKP", fromName: "Vijayawada",    toName: "Visakhapatnam" },
  { from: "BZA",  to: "MAS",  fromName: "Vijayawada",    toName: "Chennai" },
  { from: "SC",   to: "BZA",  fromName: "Secunderabad",  toName: "Vijayawada" },
  { from: "VSKP", to: "HWH",  fromName: "Visakhapatnam", toName: "Howrah" },
];

async function findStation(code) {
  const results = await api.searchStations(code);
  return results.find((s) => s.station_code === code) || null;
}

export default function HomePage() {
  const user     = getUserFromToken();
  const [bookings, setBookings] = useState([]);
  const [popularError, setPopularError] = useState("");
  const config   = useClassConfig();
  const navigate = useNavigate();

  async function searchPopular(route) {
    setPopularError("");
    try {
      const [from, to] = await Promise.all([findStation(route.from), findStation(route.to)]);
      if (!from || !to) throw new Error("That route is not available right now.");
      const params = new URLSearchParams({
        fromId: from.station_id, toId: to.station_id, date: toDateString(), cls: "ALL",
        fromName: from.station_name, fromCode: from.station_code,
        toName: to.station_name,     toCode: to.station_code,
      });
      navigate(`/search?${params.toString()}`);
    } catch (e) {
      setPopularError(e.message);
    }
  }

  useEffect(() => {
    if (!user) return;
    api.getMyBookings().then(setBookings).catch(() => {});
    // `user` is derived from localStorage on each render, so it is not a
    // stable dependency; Navbar remounts this page on auth change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter before slicing, and compare against departure time rather than
  // midnight, so a train leaving later today still counts as upcoming.
  const now = new Date();
  const upcoming = bookings
    .filter((b) => b.booking_status === "CONFIRMED")
    .map((b) => ({ b, at: departureDateTime(b.journey_date, b.departure_time, b.departure_day_offset) }))
    .filter(({ at }) => at && at >= now)
    .sort((x, y) => x.at - y.at)
    .slice(0, 2)
    .map(({ b }) => b);
  const showCards = upcoming.length > 0;

  return (
    <div className="hp-page">
      {/* Hero */}
      <div className="hp-hero">
        <div className="hp-hero-content">
          <h1 className="hp-hero-title">Where are you headed?</h1>
          <p className="hp-hero-sub">Search trains, check availability and book instantly</p>
          <SearchBox />
        </div>
      </div>

      <div className="hp-body">
        {/* Upcoming journeys */}
        {user && showCards && (
          <section className="hp-section">
            <div className="hp-section-header">
              <h2 className="hp-section-title">Upcoming journeys</h2>
              <Link to="/my-bookings" className="hp-see-all">See all →</Link>
            </div>
            {upcoming.map((b) => (
              <Link to={`/ticket/${b.booking_id}`} key={b.booking_id} className="hp-booking-card">
                <div className="hp-bc-top">
                  <div>
                    <div className="hp-train-name">{b.train_name}</div>
                    <div className="hp-train-meta">{b.train_number} · {classDisplay(config, b.coach_type)}</div>
                  </div>
                  <span className="hp-badge hp-badge--green">Confirmed</span>
                </div>
                <div className="hp-route">
                  <div>
                    <div className="hp-stn-code">{b.source_code}</div>
                    <div className="hp-stn-time">{formatTime(b.departure_time)} · {formatDate(stopDate(b.journey_date, b.departure_day_offset))}</div>
                  </div>
                  <div className="hp-route-mid">
                    <div className="hp-route-bar" />
                    <div className="hp-route-dur">{b.passenger_count} pax</div>
                  </div>
                  <div className="hp-stn-right">
                    <div className="hp-stn-code">{b.dest_code}</div>
                    <div className="hp-stn-time">
                      {formatTime(b.arrival_time)}
                      {dayShift(b.departure_day_offset, b.arrival_day_offset) && (
                        <span className="day-shift">{dayShift(b.departure_day_offset, b.arrival_day_offset)}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="hp-pnr-row">
                  <div>
                    <div className="hp-pnr-label">PNR</div>
                    <div className="hp-pnr-val">{b.pnr}</div>
                  </div>
                  <span className="hp-view-ticket">View ticket →</span>
                </div>
              </Link>
            ))}
          </section>
        )}

        {/* Popular routes */}
        <section className="hp-section">
          <div className="hp-section-header">
            <h2 className="hp-section-title">Popular routes</h2>
          </div>
          <div className="hp-popular-grid">
            {POPULAR.map((r) => (
              <button key={r.from + r.to} type="button" className="hp-pop-card"
                onClick={() => searchPopular(r)}>
                <div>
                  <div className="hp-pop-route">{r.from} → {r.to}</div>
                  <div className="hp-pop-meta">{r.fromName} to {r.toName}</div>
                </div>
                <div className="hp-pop-fare">Today's trains →</div>
              </button>
            ))}
          </div>
          {popularError && <div className="hp-pop-error">{popularError}</div>}
        </section>
      </div>
    </div>
  );
}