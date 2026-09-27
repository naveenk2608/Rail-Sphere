import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useClassConfig } from "../hooks/useClassConfig";
import { api } from "../utils/api";
import { formatDate, formatTime, departureDateTime, dayShift, stopDate } from "../utils/dates";
import { classDisplay } from "../utils/fareCalculator";
import "./MyBookings.css";

const TABS = ["Upcoming", "Past", "Cancelled"];

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState("Upcoming");
  const [error,    setError]    = useState("");
  const config = useClassConfig();

  useEffect(() => {
    api.getMyBookings()
      .then(setBookings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();

  function classify(b) {
    const departure = departureDateTime(b.journey_date, b.departure_time, b.departure_day_offset);
    return {
      isPast: departure ? departure < now : false,
      isCancelled: b.booking_status === "CANCELLED",
    };
  }

  const filtered = bookings.filter((b) => {
    const { isPast, isCancelled } = classify(b);
    if (tab === "Upcoming")  return !isPast && !isCancelled;
    if (tab === "Past")      return isPast  && !isCancelled;
    if (tab === "Cancelled") return isCancelled;
    return true;
  });

  return (
    <div className="mb-page">
      <div className="mb-header">
        <h1 className="mb-title">My Bookings</h1>
        <div className="mb-tabs">
          {TABS.map((t) => (
            <button key={t} className={`mb-tab ${tab === t ? "mb-tab--active" : ""}`} onClick={() => setTab(t)}>
              {t}
              <span className="mb-tab-count">
                {bookings.filter((b) => {
                  const { isPast, isCancelled } = classify(b);
                  if (t === "Upcoming")  return !isPast && !isCancelled;
                  if (t === "Past")      return isPast  && !isCancelled;
                  if (t === "Cancelled") return isCancelled;
                  return false;
                }).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-body">
        {loading && <div className="mb-state">Loading bookings…</div>}

        {error && <div className="mb-state">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="mb-empty">
            <div className="mb-empty-icon">🎫</div>
            <div className="mb-empty-text">No {tab.toLowerCase()} bookings</div>
            {tab === "Upcoming" && <Link to="/" className="mb-empty-link">Search trains →</Link>}
          </div>
        )}

        {filtered.map((b) => {
          const { isPast, isCancelled } = classify(b);
          return (
            <Link to={`/ticket/${b.booking_id}`} key={b.booking_id} className="mb-card">
              <div className="mb-card-top">
                <div>
                  <div className="mb-train-name">{b.train_name}</div>
                  <div className="mb-train-meta">{b.train_number} · {classDisplay(config, b.coach_type)}</div>
                </div>
                <span className={`mb-badge ${
                  isCancelled ? "mb-badge--red" :
                  isPast ? "mb-badge--gray" : "mb-badge--green"
                }`}>
                  {isCancelled ? "Cancelled" : isPast ? "Completed" : "Confirmed"}
                </span>
              </div>

              <div className="mb-route">
                <div>
                  <div className="mb-stn-code">{b.source_code}</div>
                  <div className="mb-stn-time">{formatTime(b.departure_time)}</div>
                </div>
                <div className="mb-route-mid">
                  <div className="mb-route-bar" />
                  <div className="mb-route-info">{formatDate(stopDate(b.journey_date, b.departure_day_offset))} · {b.passenger_count} pax</div>
                </div>
                <div className="mb-stn-right">
                  <div className="mb-stn-code">{b.dest_code}</div>
                  <div className="mb-stn-time">
                    {formatTime(b.arrival_time)}
                    {dayShift(b.departure_day_offset, b.arrival_day_offset) && (
                      <span className="day-shift">{dayShift(b.departure_day_offset, b.arrival_day_offset)}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-footer">
                <div>
                  <span className="mb-pnr-label">PNR </span>
                  <span className="mb-pnr">{b.pnr}</span>
                </div>
                <span className="mb-amount">₹ {Number(b.total_amount).toLocaleString("en-IN")}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}