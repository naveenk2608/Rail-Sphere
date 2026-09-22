import { useState } from "react";
import { api } from "../utils/api";
import { formatDate, formatTime } from "../utils/dates";
import "./PNRStatus.css";

const PNR_LENGTH = 12;

function fmtDate(d) {
  return formatDate(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function PNRStatus() {
  const [pnr,     setPnr]     = useState("");
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSearch(e) {
    e.preventDefault();
    if (pnr.trim().length !== PNR_LENGTH) { setError(`Enter a valid ${PNR_LENGTH}-digit PNR.`); return; }
    setError(""); setBooking(null); setLoading(true);
    try {
      const data = await api.getByPNR(pnr.trim());
      setBooking(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const cancelled = booking?.booking_status === "CANCELLED";

  return (
    <div className="ps-page">
      <div className="ps-body">
        <div className="ps-hero">
          <h1 className="ps-title">PNR Status</h1>
          <p className="ps-sub">Enter your 12-digit PNR to check booking status</p>

          <form className="ps-form" onSubmit={handleSearch}>
            <input className="ps-input" placeholder="Enter 12-digit PNR"
              value={pnr} onChange={(e) => setPnr(e.target.value.replace(/\D/g, "").slice(0, PNR_LENGTH))}
              maxLength={PNR_LENGTH} inputMode="numeric" />
            <button className="ps-btn" type="submit" disabled={loading}>
              {loading ? "Checking…" : "Check Status"}
            </button>
          </form>
          {error && <div className="ps-error">{error}</div>}
        </div>

        {booking && (
          <div className="ps-result">
            {/* Status banner */}
            <div className={`ps-status-banner ${cancelled ? "ps-status-banner--cancelled" : "ps-status-banner--confirmed"}`}>
              {cancelled ? "⚠ Booking Cancelled" : "✓ Booking Confirmed"}
            </div>

            <div className="ps-card">
              {/* Train + route */}
              <div className="ps-section">
                <div className="ps-card-row">
                  <div>
                    <div className="ps-train-name">{booking.train_name}</div>
                    <div className="ps-train-no">{booking.train_number}</div>
                  </div>
                  <div className="ps-pnr-block">
                    <div className="ps-pnr-label">PNR</div>
                    <div className="ps-pnr">{booking.pnr}</div>
                  </div>
                </div>

                <div className="ps-route">
                  <div>
                    <div className="ps-stn-code">{booking.source_code}</div>
                    <div className="ps-stn-name">{booking.source_name}</div>
                    <div className="ps-stn-time">{formatTime(booking.departure_time)}</div>
                  </div>
                  <div className="ps-route-mid">
                    <div className="ps-route-line" />
                    <div className="ps-route-date">{fmtDate(booking.journey_date)}</div>
                  </div>
                  <div className="ps-stn-right">
                    <div className="ps-stn-code">{booking.dest_code}</div>
                    <div className="ps-stn-name">{booking.dest_name}</div>
                    <div className="ps-stn-time">{formatTime(booking.arrival_time)}</div>
                  </div>
                </div>
              </div>

              <div className="ps-divider" />

              {/* Passengers */}
              <div className="ps-section">
                <div className="ps-section-title">Passenger details</div>
                <div className="table-scroll">
                <table className="ps-table">
                  <thead>
                    <tr><th>#</th><th>Name</th><th>Age</th><th>Gender</th><th>Coach</th><th>Seat</th></tr>
                  </thead>
                  <tbody>
                    {booking.passengers.map((p, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{p.passenger_name}</td>
                        <td>{p.age}</td>
                        <td>{p.gender === "M" ? "Male" : p.gender === "F" ? "Female" : "Other"}</td>
                        <td>{p.coach_number}</td>
                        <td>{p.seat_no}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              <div className="ps-divider" />

              <div className="ps-section ps-fare-row">
                <span className="ps-fare-label">Total fare</span>
                <span className="ps-fare-val">₹ {Number(booking.total_amount).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}