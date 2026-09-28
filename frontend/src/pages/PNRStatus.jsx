import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import { useClassConfig } from "../hooks/useClassConfig";
import { classDisplay } from "../utils/fareCalculator";
import { api } from "../utils/api";
import { formatDate, formatTime, stopDate, dayShift } from "../utils/dates";
import "./PNRStatus.css";

const PNR_LENGTH = 12;

function fmtDate(d) {
  return formatDate(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function PNRStatus() {
  const [params, setParams] = useSearchParams();
  const initial = (params.get("pnr") || "").replace(/\D/g, "").slice(0, PNR_LENGTH);
  const [pnr,     setPnr]     = useState(initial);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const config = useClassConfig();

  async function lookup(value) {
    if (value.length !== PNR_LENGTH) { setError(`Enter a valid ${PNR_LENGTH}-digit PNR.`); return; }
    setError(""); setBooking(null); setLoading(true);
    try {
      const data = await api.getByPNR(value);
      setBooking(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    const value = pnr.trim();
    // Keep the PNR in the URL so the result can be bookmarked or shared.
    if (value.length === PNR_LENGTH) setParams({ pnr: value }, { replace: true });
    lookup(value);
  }

  // Arriving from a link such as /pnr-status?pnr=123456789012 checks it straight away.
  useEffect(() => {
    if (initial.length === PNR_LENGTH) lookup(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on first load
  }, []);

  const cancelled = booking?.booking_status === "CANCELLED";
  const shift = booking ? dayShift(booking.departure_day_offset, booking.arrival_day_offset) : "";

  return (
    <div className="ps-page">
      <div className="ps-body">
        <div className="ps-hero">
          <h1 className="ps-title">PNR status</h1>
          <p className="ps-sub">Anyone with the PNR can check a booking. No login needed.</p>

          <form className="ps-form" onSubmit={handleSearch}>
            <label htmlFor="pnr-input" className="visually-hidden">12-digit PNR</label>
            <input id="pnr-input" className="ps-input mono" placeholder="12-digit PNR" autoComplete="off"
              value={pnr} onChange={(e) => setPnr(e.target.value.replace(/\D/g, "").slice(0, PNR_LENGTH))}
              maxLength={PNR_LENGTH} inputMode="numeric" />
            <button className="btn btn--primary btn--lg ps-btn" type="submit" disabled={loading}>
              {loading ? "Checking…" : <><Icon name="search" /> Check status</>}
            </button>
          </form>
          {error && <div className="ps-error" role="alert">{error}</div>}
        </div>

        {booking && (
          <div className="ps-result">
            {/* Status banner */}
            <div className={`ps-status-banner ${cancelled ? "ps-status-banner--cancelled" : "ps-status-banner--confirmed"}`}>
              {cancelled ? <><Icon name="alert" size={17} /> Booking cancelled</> : <><Icon name="check" size={17} strokeWidth={2.4} /> Booking confirmed</>}
            </div>

            <div className="ps-card">
              {/* Train + route */}
              <div className="ps-section">
                <div className="ps-card-row">
                  <div>
                    <div className="ps-train-name">{booking.train_name}</div>
                    <div className="ps-train-no">{booking.train_number} · {classDisplay(config, booking.coach_type)}</div>
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
                    <div className="ps-route-date">
                      {fmtDate(stopDate(booking.journey_date, booking.departure_day_offset))}
                    </div>
                  </div>
                  <div className="ps-stn-right">
                    <div className="ps-stn-code">{booking.dest_code}</div>
                    <div className="ps-stn-name">{booking.dest_name}</div>
                    <div className="ps-stn-time">
                      {formatTime(booking.arrival_time)}
                      {shift && <span className="day-shift">{shift}</span>}
                    </div>
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
                    <tr><th>#</th><th>Name</th><th>Age</th><th>Gender</th><th>Coach</th><th>Seat</th><th>Status</th></tr>
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
                        <td>
                          <span className={`ps-pax-status ${p.status === "CANCELLED" ? "is-cancelled" : ""}`}>
                            {p.status === "CANCELLED" ? "Cancelled" : "Confirmed"}
                          </span>
                        </td>
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