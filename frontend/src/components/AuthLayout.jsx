import { Link } from "react-router-dom";
import Icon, { Logo } from "./Icon";
import "../pages/Auth.css";

// A sample e-ticket for the decorative side panel. 12711 timings from seed.sql.
function TicketPreview() {
  return (
    <div className="tp">
      <div className="tp-head">
        <span className="tp-brand"><Logo size={20} /> Rail-Sphere</span>
        <span className="tp-badge"><Icon name="check" size={12} strokeWidth={2.6} /> Confirmed</span>
      </div>
      <div className="tp-route">
        <div><div className="tp-code mono">BZA</div><div className="tp-time mono">06:00</div></div>
        <div className="tp-mid"><span className="tp-line" /><span className="tp-train">12711 Pinakini Express</span></div>
        <div className="tp-right"><div className="tp-code mono">MAS</div><div className="tp-time mono">12:45</div></div>
      </div>
      <dl className="tp-grid">
        <div><dt>Passenger</dt><dd>Priya Kumar</dd></div>
        <div><dt>Class</dt><dd>Sleeper</dd></div>
        <div><dt>Coach · Seat</dt><dd className="mono">S2 · 23</dd></div>
        <div><dt>PNR</dt><dd className="mono">4812 0937 5521</dd></div>
      </dl>
      <span className="tp-sample">Sample ticket</span>
    </div>
  );
}

// Form on the left; on wide screens, what the traveller gets on the right.
export default function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-main">
        <div className="auth-card">
          <Link to="/" className="auth-logo" aria-label="Rail-Sphere home">
            <Logo size={30} />
            <span className="auth-logo-text">Rail-Sphere</span>
          </Link>
          {children}
        </div>
      </div>
      <aside className="auth-aside" aria-hidden="true">
        <div className="auth-aside-inner">
          <p className="auth-aside-title">Your tickets and trips, in one place.</p>
          <ul className="auth-aside-list">
            <li><Icon name="ticket" size={16} /> E-tickets you can email or print</li>
            <li><Icon name="clock" size={16} /> Reminders for trains leaving within a day</li>
            <li><Icon name="search" size={16} /> PNR status for every booking</li>
          </ul>
          <TicketPreview />
        </div>
      </aside>
    </div>
  );
}
