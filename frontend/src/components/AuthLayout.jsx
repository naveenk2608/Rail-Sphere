import { Link } from "react-router-dom";
import { Logo } from "./Icon";
import { SeatTimeline } from "./landing/Hero";
import "../pages/Auth.css";

// Form on the left; on wide screens, the product's core idea on the right.
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
          <p className="auth-aside-kicker mono">Segment-level seat allocation</p>
          <p className="auth-aside-title">One berth. Three passengers. No overlap.</p>
          <SeatTimeline />
        </div>
      </aside>
    </div>
  );
}
