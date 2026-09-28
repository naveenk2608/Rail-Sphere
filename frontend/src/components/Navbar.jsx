import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { getUserFromToken } from "../hooks/useAuth";
import { api } from "../utils/api";
import { departureDateTime } from "../utils/dates";
import Icon, { Logo } from "./Icon";
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
        bookingId: b.booking_id,
        text: `${b.train_name} departs from ${b.source_code} in ${hrsLabel}`,
        departsAt,
      });
    }
  }

  return notifs.sort((a, b) => a.departsAt - b.departsAt);
}

const LINKS = [
  { to: "/", label: "Search trains", end: true },
  { to: "/how-it-works", label: "How it works" },
  { to: "/pnr-status", label: "PNR status" },
];

export default function Navbar({ authKey }) {
  const [menuOpen,      setMenuOpen]      = useState(false);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [scrolled,      setScrolled]      = useState(false);
  const [user,          setUser]          = useState(null);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Over the landing page's dark hero the bar starts transparent.
  const overHero = location.pathname === "/" && !scrolled && !mobileOpen;

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
  }, [authKey]);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 12); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Any navigation closes open menus.
  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen && !notifOpen && !mobileOpen) return undefined;
    function close(e) {
      if (!e.target.closest(".nav-account")) setMenuOpen(false);
      if (!e.target.closest(".nav-notif"))   setNotifOpen(false);
      if (!e.target.closest(".nav-mobile, .nav-burger")) setMobileOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") { setMenuOpen(false); setNotifOpen(false); setMobileOpen(false); }
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, notifOpen, mobileOpen]);

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
    setMenuOpen(false);
    setNotifications([]);
    navigate("/");
  }

  function toggleNotifications() {
    setNotifOpen((p) => !p);
    setMenuOpen(false);
    api.getMyBookings()
      .then((bookings) => setNotifications(buildNotifications(bookings)))
      .catch(() => {});
  }

  const links = user ? [...LINKS, { to: "/my-bookings", label: "My bookings" }] : LINKS;

  return (
    <header className={`nav ${overHero ? "nav--hero" : ""} ${scrolled ? "nav--scrolled" : ""}`}>
      <div className="nav-inner">
        <Link to="/" className="nav-logo" aria-label="Rail-Sphere home">
          <Logo size={28} />
          <span className="nav-logo-text">Rail-Sphere</span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}
              className={({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              <div className="nav-notif">
                <button className="nav-icon-btn" onClick={toggleNotifications}
                  aria-label={`Notifications${notifications.length ? `, ${notifications.length} new` : ""}`}
                  aria-expanded={notifOpen}>
                  <Icon name="bell" size={18} />
                  {notifications.length > 0 && <span className="nav-dot">{notifications.length}</span>}
                </button>
                {notifOpen && (
                  <div className="nav-pop nav-pop--notif" role="dialog" aria-label="Notifications">
                    <div className="nav-pop-head">Departing in the next 24 hours</div>
                    {notifications.length === 0 ? (
                      <div className="nav-pop-empty">
                        <Icon name="bell" size={22} />
                        <span>Nothing departing soon</span>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <Link key={n.id} to={`/ticket/${n.bookingId}`} className="nav-pop-item">
                          <Icon name="train" size={16} />
                          <span>{n.text}</span>
                        </Link>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="nav-account">
                <button className="nav-user" onClick={() => { setMenuOpen((p) => !p); setNotifOpen(false); }}
                  aria-expanded={menuOpen} aria-haspopup="menu">
                  <span className="nav-avatar" aria-hidden="true">{user.initials}</span>
                  <span className="nav-user-name">{user.name}</span>
                </button>
                {menuOpen && (
                  <div className="nav-pop" role="menu">
                    <div className="nav-pop-user">
                      <div className="nav-pop-name">{user.name}</div>
                      <div className="nav-pop-email">{user.email}</div>
                    </div>
                    <Link to="/my-bookings" className="nav-pop-item" role="menuitem">
                      <Icon name="ticket" size={16} /><span>My bookings</span>
                    </Link>
                    <Link to="/pnr-status" className="nav-pop-item" role="menuitem">
                      <Icon name="search" size={16} /><span>PNR status</span>
                    </Link>
                    <button className="nav-pop-item nav-pop-item--danger" role="menuitem" onClick={handleLogout}>
                      <Icon name="logout" size={16} /><span>Log out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="nav-auth">
              <Link to="/login" className="nav-login">Log in</Link>
              <Link to="/signup" className="btn btn--primary btn--sm nav-signup">Sign up</Link>
            </div>
          )}

          <button className="nav-icon-btn nav-burger" onClick={() => setMobileOpen((p) => !p)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen}
            aria-controls="nav-mobile">
            <Icon name={mobileOpen ? "x" : "menu"} size={20} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav id="nav-mobile" className="nav-mobile" aria-label="Mobile">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}
              className={({ isActive }) => `nav-mobile-link ${isActive ? "nav-mobile-link--active" : ""}`}>
              {l.label}
              <Icon name="arrow" size={16} />
            </NavLink>
          ))}
          {!user && (
            <div className="nav-mobile-auth">
              <Link to="/login" className="btn btn--secondary">Log in</Link>
              <Link to="/signup" className="btn btn--primary">Sign up</Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
