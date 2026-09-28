import { Link } from "react-router-dom";
import { AUTHOR_URL, GITHUB_URL, README_URL } from "../utils/site";
import { GitHubMark, Logo } from "./Icon";
import "./Footer.css";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Search trains", to: "/" },
      { label: "PNR status", to: "/pnr-status" },
      { label: "My bookings", to: "/my-bookings" },
    ],
  },
  {
    title: "Engineering",
    links: [
      { label: "How it works", to: "/how-it-works" },
      { label: "Data model", to: "/how-it-works#data-model" },
      { label: "API reference", to: "/how-it-works#api" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "Source code", href: GITHUB_URL },
      { label: "README", href: README_URL },
      { label: "Author", href: AUTHOR_URL },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo" aria-label="Rail-Sphere home">
            <Logo size={26} /><span>Rail-Sphere</span>
          </Link>
          <p>
            Train reservations with seats sold per route segment and a
            checkout that can't double‑book.
          </p>
          <a href={GITHUB_URL} className="footer-gh" target="_blank" rel="noreferrer">
            <GitHubMark size={16} /> naveenk2608/Rail-Sphere
          </a>
        </div>

        {COLUMNS.map((col) => (
          <nav key={col.title} className="footer-col" aria-label={col.title}>
            <div className="footer-col-title">{col.title}</div>
            {col.links.map((l) => (l.to
              ? <Link key={l.label} to={l.to}>{l.label}</Link>
              : <a key={l.label} href={l.href} target="_blank" rel="noreferrer">{l.label}</a>))}
          </nav>
        ))}
      </div>
      <div className="container footer-base">
        <span>Built by Naveen Kumar · B.Tech CSE, VIT-AP University</span>
        <span className="mono">React · Express · MySQL</span>
      </div>
    </footer>
  );
}
