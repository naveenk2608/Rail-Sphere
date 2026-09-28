import { Link } from "react-router-dom";
import SearchBox from "../SearchBox";
import Icon, { GitHubMark } from "../Icon";
import { GITHUB_URL } from "../../utils/site";
import "./SeatTimeline.css";

// 12806 Janmabhoomi Express, straight from seed.sql: stop codes and their
// distance from origin in km. Positions on the timeline are to scale.
const STOPS = [
  { code: "SC",   km: 0 },
  { code: "KMC",  km: 170 },
  { code: "BZA",  km: 270 },
  { code: "EE",   km: 330 },
  { code: "RJY",  km: 420 },
  { code: "SLO",  km: 470 },
  { code: "ANV",  km: 590 },
  { code: "VSKP", km: 620 },
];
const TOTAL_KM = 620;

// Three bookings on one berth. Fares are what the backend's fare formula
// returns for a sleeper seat over each distance.
const SEGMENTS = [
  { name: "Priya",  from: "SC",  to: "BZA",  pnr: "4812 0937 5521", fare: 162 },
  { name: "Arjun",  from: "BZA", to: "RJY",  pnr: "7304 6618 2049", fare: 104 },
  { name: "Lakshmi", from: "RJY", to: "VSKP", pnr: "2295 8140 7736", fare: 128 },
];

const pct = (code) => (STOPS.find((s) => s.code === code).km / TOTAL_KM) * 100;

export function SeatTimeline() {
  return (
    <figure className="tl" aria-label="One sleeper berth on the Janmabhoomi Express sold to three passengers on consecutive stretches of the route">
      <div className="tl-head">
        <div>
          <div className="tl-title">Coach S1 · Berth 23</div>
          <div className="tl-sub mono">12806 Janmabhoomi Exp · Tue 6 Oct</div>
        </div>
        <span className="tl-live"><span className="tl-live-dot" />3 PNRs, 1 berth</span>
      </div>

      <div className="tl-track" aria-hidden="true">
        <div className="tl-rail" />
        {/* Only stops where someone boards or alights are labelled; the rest
            are too close together (ANV and VSKP are 30 km apart) to read. */}
        {STOPS.map((s) => {
          const key = SEGMENTS.some((seg) => seg.from === s.code || seg.to === s.code);
          return (
            <div key={s.code} className={`tl-stop ${key ? "" : "tl-stop--minor"}`} style={{ left: `${(s.km / TOTAL_KM) * 100}%` }}>
              <span className="tl-stop-dot" />
              {key && <span className="tl-stop-code mono">{s.code}</span>}
            </div>
          );
        })}
      </div>

      <ol className="tl-rows">
        {SEGMENTS.map((seg, i) => {
          const left = pct(seg.from);
          const width = pct(seg.to) - left;
          return (
            <li key={seg.pnr} className="tl-row" style={{ "--i": i }}>
              <div className="tl-bar" style={{ left: `${left}%`, width: `${width}%` }}>
                <span className="tl-bar-name">{seg.name}</span>
                <span className="tl-bar-route mono">{seg.from}→{seg.to}</span>
              </div>
              <span className="visually-hidden">
                {seg.name}, {seg.from} to {seg.to}, PNR {seg.pnr}, ₹{seg.fare}
              </span>
            </li>
          );
        })}
      </ol>

      <figcaption className="tl-foot">
        <div>
          <span className="tl-foot-label">Segment allocation</span>
          <span className="tl-foot-val mono">₹394 <em>· 3 passengers</em></span>
        </div>
        <div>
          <span className="tl-foot-label">Whole-route blocking</span>
          <span className="tl-foot-val tl-foot-val--muted mono">₹331 <em>· 1 passenger</em></span>
        </div>
      </figcaption>
    </figure>
  );
}

export default function Hero() {
  function focusSearch() {
    const panel = document.getElementById("search");
    panel?.scrollIntoView({ block: "center" });
    panel?.querySelector("input")?.focus({ preventScroll: true });
  }

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-bg" aria-hidden="true">
        <div className="hero-glow" />
        <svg className="hero-lines" viewBox="0 0 1200 600" preserveAspectRatio="none">
          <path d="M-20 520 C 300 470, 520 300, 1220 250" />
          <path d="M-20 560 C 340 520, 600 360, 1220 330" />
          <path d="M-20 600 C 380 570, 700 430, 1220 410" />
        </svg>
      </div>

      <div className="container hero-inner">
        <div className="hero-copy">
          <p className="hero-kicker mono">
            <span className="hero-kicker-tag">Open source</span>
            Train reservations · React, Express, MySQL
          </p>
          <h1 id="hero-title" className="hero-title">
            Book the seat,<br /><span>not the whole route.</span>
          </h1>
          <p className="hero-sub">
            Rail-Sphere sells every berth by route segment, so a seat freed at
            Vijayawada is bookable onward to Visakhapatnam. Checkout runs in one
            locked transaction, so two passengers never get the same berth.
          </p>
          <div className="hero-ctas">
            <button type="button" className="btn btn--light btn--lg" onClick={focusSearch}>
              <Icon name="search" /> Find a train
            </button>
            <Link to="/how-it-works" className="btn btn--ghost-dark btn--lg">
              How it works <Icon name="arrow" />
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hero-gh">
              <GitHubMark size={16} /> View source
            </a>
          </div>
          <dl className="hero-stats">
            <div><dt>Concurrent requests for one berth</dt><dd className="mono">200 → 1 booked</dd></div>
            <div><dt>Seat check</dt><dd className="mono">per segment</dd></div>
            <div><dt>Checkout</dt><dd className="mono">1 transaction</dd></div>
          </dl>
        </div>

        <div className="hero-visual">
          <SeatTimeline />
        </div>

        {/* After the copy in source order, so on phones the form comes
            before the illustration; the desktop grid moves it below both. */}
        <div className="hero-search" id="search">
          <SearchBox />
        </div>
      </div>
    </section>
  );
}
