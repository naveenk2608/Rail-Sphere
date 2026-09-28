import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Icon, { Logo } from "../components/Icon";
import Toast from "../components/Toast";
import { useClassConfig } from "../hooks/useClassConfig";
import { api } from "../utils/api";
import { dayShift, formatDate, formatTime, hasDeparted, stopDate } from "../utils/dates";
import { classDisplay } from "../utils/fareCalculator";
import "./Ticket.css";

function fmtDate(d) {
  return formatDate(d, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function Ticket() {
  const { bookingId } = useParams();
  const navigate      = useNavigate();
  const location      = useLocation();
  const config        = useClassConfig();
  const [booking,  setBooking]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState(null);
  // The booking page navigates here with { booked: true } on success; that
  // switches on the confirmation view for this visit.
  const [justBooked] = useState(() => Boolean(location.state?.booked));
  const [cancelling, setCancelling] = useState(false);

  // Clear it from history, so a refresh shows the plain ticket.
  // Re-runs once after the replace, when the state is already gone.
  useEffect(() => {
    if (location.state?.booked) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    api.getBookingById(bookingId)
      .then(setBooking)
      .catch(() => navigate("/my-bookings"))
      .finally(() => setLoading(false));
  }, [bookingId, navigate]);

  async function handleEmail() {
    try {
      const res = await api.emailTicket(bookingId);
      setToast({ message: res.message || "Ticket sent to your email!", type: "success" });
    } catch (err) {
      setToast({ message: err.message || "Failed to send email.", type: "error" });
    }
  }

  async function handleCancel() {
    if (!window.confirm("Are you sure you want to cancel this booking? This cannot be undone.")) return;
    setCancelling(true);
    try {
      await api.cancelBooking(bookingId);
      setToast({ message: "Booking cancelled.", type: "info" });
      setBooking((b) => ({ ...b, booking_status: "CANCELLED" }));
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setCancelling(false);
    }
  }

  function handlePrint() { window.print(); }

  if (loading) {
    return (
      <div className="page-body tk-body" aria-busy="true">
        <div className="skeleton" style={{ height: 96, borderRadius: 14 }} />
        <div className="skeleton" style={{ height: 320, marginTop: 14, borderRadius: 14 }} />
      </div>
    );
  }
  if (!booking) return null;

  const cancelled = booking.booking_status === "CANCELLED";
  const departed  = hasDeparted(booking.journey_date, booking.departure_time, booking.departure_day_offset);
  const departsOn = stopDate(booking.journey_date, booking.departure_day_offset);
  const arrivesOn = stopDate(booking.journey_date, booking.arrival_day_offset);
  const shift = dayShift(booking.departure_day_offset, booking.arrival_day_offset);

  return (
    <div className="tk-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="page-head no-print">
        <div className="page-head-inner">
          <button type="button" className="page-back" onClick={() => navigate("/my-bookings")} aria-label="Back to My bookings">
            <Icon name="arrow" size={17} className="flip" />
          </button>
          <div>
            <h1 className="page-title">{justBooked && !cancelled ? "Booking confirmed" : "E-ticket"}</h1>
            <p className="page-sub mono">PNR {booking.pnr}</p>
          </div>
          <div className="page-head-actions">
            {!cancelled && (
              <>
                <button type="button" className="btn btn--secondary btn--sm" onClick={handleEmail}>
                  <Icon name="mail" /> Email ticket
                </button>
                <button type="button" className="btn btn--secondary btn--sm" onClick={handlePrint}>
                  <Icon name="printer" /> Download ticket
                </button>
                {/* The server refuses to cancel after departure; don't offer it. */}
                {!departed && (
                  <button type="button" className="btn btn--sm tk-btn-cancel" onClick={handleCancel} disabled={cancelling}>
                    {cancelling ? "Cancelling…" : "Cancel booking"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <div className="page-body tk-body">
        {justBooked && !cancelled && (
          <section className="tk-confirm no-print" aria-labelledby="tk-confirm-title">
            <span className="tk-confirm-icon" aria-hidden="true"><Icon name="check" size={22} strokeWidth={2.6} /></span>
            <div className="tk-confirm-text">
              <h2 id="tk-confirm-title">Your booking is confirmed</h2>
              <p>
                {booking.train_number} {booking.train_name} · {booking.source_code} → {booking.dest_code} ·{" "}
                {fmtDate(stopDate(booking.journey_date, booking.departure_day_offset))}
              </p>
              <p className="tk-confirm-pnr">PNR <span className="mono">{booking.pnr}</span></p>
            </div>
            <div className="tk-confirm-actions">
              <button type="button" className="btn btn--primary" onClick={handlePrint}>
                <Icon name="printer" /> Download ticket
              </button>
              <Link to={`/pnr-status?pnr=${booking.pnr}`} className="btn btn--secondary">View PNR status</Link>
            </div>
          </section>
        )}
        {cancelled && (
          <div className="tk-cancelled-banner" role="status"><Icon name="alert" size={17} /> This booking has been cancelled</div>
        )}

        {/* Ticket card */}
        <div className={`tk-card ${cancelled ? "tk-card--cancelled" : ""}`} id="ticket-print">
          {/* Header */}
          <div className="tk-header">
            <div className="tk-header-left">
              <div className="tk-logo"><Logo size={22} /> Rail-Sphere</div>
              <div className={`tk-status-badge ${cancelled ? "is-cancelled" : ""}`}>
                {cancelled ? "Cancelled" : <><Icon name="check" size={13} strokeWidth={2.5} /> Confirmed</>}
              </div>
            </div>
            <div className="tk-pnr-block">
              <div className="tk-pnr-label">PNR Number</div>
              <div className="tk-pnr">{booking.pnr}</div>
            </div>
          </div>

          {/* Route */}
          <div className="tk-route">
            <div className="tk-route-stn">
              <div className="tk-stn-code">{booking.source_code}</div>
              <div className="tk-stn-name">{booking.source_name}</div>
              <div className="tk-stn-time">{formatTime(booking.departure_time)}</div>
              <div className="tk-stn-date">{fmtDate(departsOn)}</div>
            </div>
            <div className="tk-route-mid">
              <div className="tk-route-line" />
              <div className="tk-route-train">{booking.train_number} · {booking.train_name}</div>
              <div className="tk-route-date">{classDisplay(config, booking.coach_type)}</div>
            </div>
            <div className="tk-route-stn tk-route-stn--right">
              <div className="tk-stn-code">{booking.dest_code}</div>
              <div className="tk-stn-name">{booking.dest_name}</div>
              <div className="tk-stn-time">
                {formatTime(booking.arrival_time)}
                {shift && <span className="day-shift">{shift}</span>}
              </div>
              <div className="tk-stn-date">{fmtDate(arrivesOn)}</div>
            </div>
          </div>

          <div className="tk-divider-dashed" />

          {/* Passenger table */}
          <div className="tk-pax-section">
            <div className="tk-pax-title">Passenger details</div>
            <div className="table-scroll">
            <table className="tk-table">
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Age</th><th>Gender</th><th>Coach</th><th>Seat</th>
                </tr>
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

          <div className="tk-divider-dashed" />

          {/* Footer */}
          <div className="tk-footer">
            <div className="tk-fare-block">
              <div className="tk-fare-label">Total paid</div>
              <div className="tk-fare-val">₹ {Number(booking.total_amount).toLocaleString("en-IN")}</div>
            </div>
            <div className="tk-booked-on">Booked on {new Date(booking.created_at).toLocaleDateString("en-IN")}</div>
          </div>
        </div>
      </div>

    </div>
  );
}