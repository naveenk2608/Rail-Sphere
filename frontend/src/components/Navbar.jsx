import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUserFromToken } from "../hooks/useAuth";
import { api } from "../utils/api";
import { departureDateTime } from "../utils/dates";
import "./Navbar.css";

function buildNotifications(bookings) {
  const now = new Date();
  const notifs = [];

  for (const b of bookings) {
    if (b.booking_status === "CANCELLED") continue;

    const departsAt = departureDateTime(b.journey_date, b.departure_time, b.departure_day_offset);
    if (!departsAt) continue;

    const hoursUntil = (departsAt - now) / (1000 * 60 * 60);
    if (hoursUntil > 0 && hoursUntil <= 24) {
      const hrsLabel = hoursUntil < 1
        ? `${Math.round(hoursUntil * 60)} min`
        : `${Math.round(hoursUntil)} hr`;
      notifs.push({
        id: `dep-${b.booking_id}`,
        icon: "🚆",
        text: `${b.train_name} departs from ${b.source_code} in ${hrsLabel}`,
        departsAt,
      });
    }
  }

  return notifs.sort((a, b) => a.departsAt - b.departsAt);
}

export default function Navbar({ onAuthChange }) {
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [user,          setUser]          = useState(null);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const u = getUserFromToken();
    setUser(u);
    if (u) {
      api.getMyBookings()
        .then((bookings) => setNotifications(buildNotifications(bookings)))
        .catch(() => setNotifications([]));
    } else {
      setNotifications([]);
    }
  }, [onAuthChange]);

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
    setMenuOpen(false);
    navigate("/");
  }

  useEffect(() => {
    if (!menuOpen && !notifOpen) return;
    function close(e) {
      if (!e.target.closest(".navbar-avatar-wrapper")) setMenuOpen(false);
      if (!e.target.closest(".navbar-notif-wrapper"))  setNotifOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen, notifOpen]);

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        <div className="navbar-logo-icon">🚆</div>
        <span className="navbar-logo-text">Rail-Sphere</span>
      </Link>

      <div className="navbar-links">
        <Link to="/pnr-status" className="navbar-link">PNR Status</Link>
        {user && <Link to="/my-bookings" className="navbar-link">My Bookings</Link>}
      </div>

      <div className="navbar-actions">
        {user ? (
          <>
            <div className="navbar-notif-wrapper">
              <button
                className="navbar-icon-btn"
                aria-label="Notifications"
                onClick={() => {
                  setNotifOpen((p) => !p);
                  api.getMyBookings()
                    .then((bookings) => setNotifications(buildNotifications(bookings)))
                    .catch(() => {});
                }}
              >
                🔔
                {notifications.length > 0 && (
                  <span className="navbar-notif-dot">{notifications.length}</span>
                )}
              </button>
              {notifOpen && (
                <div className="navbar-dropdown navbar-dropdown--notif">
                  <div className="navbar-dropdown-header">
                    <div className="navbar-dropdown-name">Notifications</div>
                  </div>
                  <div className="navbar-divider" />
                  {notifications.length === 0 ? (
                    <div className="navbar-notif-empty">
                      <span className="navbar-notif-empty-icon">🔔</span>
                      <span>No new notifications</span>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="navbar-notif-item">
                        <span>{n.icon}</span>
                        <span>{n.text}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="navbar-avatar-wrapper">
              <button className="navbar-user-btn" onClick={() => setMenuOpen((p) => !p)}>
                <div className="navbar-avatar">{user.initials}</div>
                <span className="navbar-user-name">{user.name}</span>
              </button>
              {menuOpen && (
                <div className="navbar-dropdown">
                  <div className="navbar-dropdown-header">
                    <div className="navbar-dropdown-name">{user.name}</div>
                    <div className="navbar-dropdown-email">{user.email}</div>
                  </div>
                  <div className="navbar-divider" />
                  <Link to="/my-bookings" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                    <span>🎫</span><span>My Bookings</span>
                  </Link>
                  <Link to="/pnr-status" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                    <span>🔍</span><span>PNR Status</span>
                  </Link>
                  <div className="navbar-divider" />
                  <div className="navbar-dropdown-item navbar-logout" onClick={handleLogout}>
                    <span>🚪</span><span>Logout</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="navbar-auth-btns">
            <Link to="/login"  className="navbar-login-btn">Login</Link>
            <Link to="/signup" className="navbar-signup-btn">Sign up</Link>
          </div>
        )}
      </div>
    </nav>
  );
}