import { Link } from "react-router-dom";
import { useReveal } from "../../hooks/useReveal";
import { GITHUB_URL } from "../../utils/site";
import Icon, { GitHubMark } from "../Icon";
import ArchitectureDiagram from "./ArchitectureDiagram";

// Excerpt of backend/controllers/bookingController.js, trimmed for display.
const LOCK_SNIPPET = [
  ["c", "// Every booking for these coaches queues here, in coach_id order,"],
  ["c", "// so two checkouts can't deadlock on the same seat range."],
  ["k", "const "], ["t", "[coaches] = "], ["k", "await "], ["t", "conn.query(\n"],
  ["s", "  `SELECT coach_id, coach_type, total_seats\n     FROM coaches\n    WHERE train_id = ? AND coach_id IN (?)\n    ORDER BY coach_id\n      FOR UPDATE`"],
  ["t", ",\n  [train_id, coachIds]\n);\n\n"],
  ["c", "// A locking read sees rows committed by whoever held the lock first."],
  ["k", "\nif "], ["t", "(conflict.length > 0)\n  "], ["k", "return "],
  ["t", "res.status("], ["n", "409"], ["t", ").json({ error: "], ["s", "\"Seat was just booked\""], ["t", " });"],
];

const TECH = [
  { name: "React 18", role: "UI and routing" },
  { name: "Vite 5", role: "Dev server and build" },
  { name: "Express 4", role: "REST API" },
  { name: "MySQL 8", role: "InnoDB, 8 tables" },
  { name: "JWT + bcrypt", role: "Auth" },
  { name: "Nodemailer", role: "E-tickets" },
];

export default function Engineering() {
  const ref = useReveal();
  return (
    <section className="section section--dark eng" id="architecture" ref={ref} aria-labelledby="eng-title">
      <div className="eng-bg" aria-hidden="true" />
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">Under the hood</p>
          <h2 id="eng-title" className="h2">A small stack, used carefully.</h2>
          <p className="lede">
            No framework magic: a React single-page app, an Express API and MySQL doing what
            relational databases are good at, which is keeping concurrent writes consistent.
          </p>
        </div>

        <div className="reveal" data-delay="1">
          <ArchitectureDiagram />
        </div>

        <div className="eng-split">
          <div className="eng-code reveal">
            <div className="eng-code-bar">
              <span className="mono">backend/controllers/bookingController.js</span>
            </div>
            <pre className="mono"><code>
              {LOCK_SNIPPET.map(([kind, text], i) => <span key={i} className={`tok-${kind}`}>{text}{kind === "c" ? "\n" : ""}</span>)}
            </code></pre>
          </div>

          <div className="eng-side reveal" data-delay="1">
            <ul className="eng-tech">
              {TECH.map((t) => (
                <li key={t.name}><span>{t.name}</span><span className="mono">{t.role}</span></li>
              ))}
            </ul>
            <div className="eng-actions">
              <Link to="/how-it-works" className="btn btn--light">
                Read the deep-dive <Icon name="arrow" />
              </Link>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn btn--ghost-dark">
                <GitHubMark size={16} /> Browse the code
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
