import { Link } from "react-router-dom";
import { GITHUB_URL } from "../utils/site";
import { GitHubMark, Logo } from "./Icon";
import "./Footer.css";

const LINKS = [
  { label: "Search trains", to: "/" },
  { label: "PNR status", to: "/pnr-status" },
  { label: "My bookings", to: "/my-bookings" },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-top">
        <div className="footer-brand">
          <Link to="/" className="footer-logo" aria-label="Rail-Sphere home">
            <Logo size={24} /><span>Rail-Sphere</span>
          </Link>
          <p>Search trains, book your seats and track your PNR, all in one place.</p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          {LINKS.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
        </nav>
      </div>
      <div className="container footer-base">
        <span>© {new Date().getFullYear()} Rail-Sphere</span>
        <a href={GITHUB_URL} className="footer-source" target="_blank" rel="noreferrer">
          <GitHubMark size={14} /> Source code
        </a>
      </div>
    </footer>
  );
}
