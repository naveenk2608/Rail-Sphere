import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Toast from "../components/Toast";
import { api } from "../utils/api";
import "./Ticket.css";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function Ticket() {
  const { bookingId } = useParams();
  const navigate      = useNavigate();
  const [booking,  setBooking]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    api.getBookingById(bookingId)
      .then(setBooking)
      .catch(() => navigate("/my-bookings"))
      .finally(() => setLoading(false));
  }, [bookingId]);

  async function handleEmail() {
    try {
      await api.emailTicket(bookingId);
      setToast({ message: "Ticket sent to your email!", type: "success" });
    } catch {
      setToast({ message: "Failed to send email.", type: "error" });
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

  if (loading) return <div className="tk-loading">Loading ticket…</div>;
  if (!booking) return null;

  const cancelled = booking.booking_status === "CANCELLED";

  return (
    <div className="tk-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="tk-topbar no-print">
        <button className="tk-back" onClick={() => navigate("/my-bookings")}>← My Bookings</button>
        <div className="tk-topbar-actions">
          {!cancelled && (
            <>
              <button className="tk-btn-outline" onClick={handleEmail}>📧 Email ticket</button>
              <button className="tk-btn-outline" onClick={handlePrint}>🖨 Print</button>
              <button className="tk-btn-cancel" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? "Cancelling…" : "Cancel booking"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="tk-body">
        {cancelled && (
          <div className="tk-cancelled-banner">⚠ This booking has been cancelled</div>
        )}

        {/* Ticket card */}
        <div className={`tk-card ${cancelled ? "tk-card--cancelled" : ""}`} id="ticket-print">
          {/* Header */}
          <div className="tk-header">
            <div className="tk-header-left">
              <div className="tk-logo">🚆 Rail-Sphere</div>
              <div className="tk-status-badge">{cancelled ? "Cancelled" : "✓ Confirmed"}</div>
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
              <div className="tk-stn-time">{booking.departure_time?.slice(0,5)}</div>
            </div>
            <div className="tk-route-mid">
              <div className="tk-route-line" />
              <div className="tk-route-train">{booking.train_number} · {booking.train_name}</div>
              <div className="tk-route-date">{fmtDate(booking.journey_date)}</div>
            </div>
            <div className="tk-route-stn tk-route-stn--right">
              <div className="tk-stn-code">{booking.dest_code}</div>
              <div className="tk-stn-name">{booking.dest_name}</div>
              <div className="tk-stn-time">{booking.arrival_time?.slice(0,5)}</div>
            </div>
          </div>

          <div className="tk-divider-dashed" />

          {/* Passenger table */}
          <div className="tk-pax-section">
            <div className="tk-pax-title">Passenger details</div>
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

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .tk-page  { background: white; }
          .tk-body  { padding: 0; }
          .tk-card  { box-shadow: none; border: 1px solid #ccc; }
        }
      `}</style>
    </div>
  );
}