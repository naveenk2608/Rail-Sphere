import { useReveal } from "../../hooks/useReveal";
import Icon from "../Icon";

// Measured with `npm run test:concurrency` (REQUESTS=200) against a local
// MySQL 8 database: one 201, and a 409 for every other request.
const STRESS = { total: 200, booked: 1, rejected: 199 };

function StressChart() {
  return (
    <div className="stress" aria-label={`${STRESS.total} simultaneous requests for one berth: ${STRESS.booked} booked, ${STRESS.rejected} rejected with 409`}>
      <div className="stress-grid" aria-hidden="true">
        {Array.from({ length: 100 }, (_, i) => (
          <i key={i} className={i === 0 ? "is-win" : ""} style={{ "--d": `${(i % 20) * 18 + Math.floor(i / 20) * 40}ms` }} />
        ))}
      </div>
      <div className="stress-legend">
        <span><b className="mono">{STRESS.booked}</b> × 201 booked</span>
        <span><b className="mono">{STRESS.rejected}</b> × 409 seat taken</span>
        <span><b className="mono">0</b> × 500</span>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: "clock",
    title: "Boarding dates that match the timetable",
    body: "A train reaching Bhubaneswar at 03:20 left Visakhapatnam the day before. Search, tickets and emails all show the day you actually board, computed in IST.",
  },
  {
    icon: "seat",
    title: "Live coach map",
    body: "Switch between coaches, see sleeper side berths laid out 6 + 2, and hold up to five seats across coaches in one booking.",
  },
  {
    icon: "ticket",
    title: "Public PNR lookup",
    body: "12 random digits from a CSPRNG, not a timestamp, so the public lookup can't be walked to read other people's trips.",
  },
  {
    icon: "mail",
    title: "E-tickets by email",
    body: "One click sends an HTML ticket through Nodemailer, with passenger names escaped and dates that don't drift with the server's timezone.",
  },
  {
    icon: "users",
    title: "Quick-fill passengers",
    body: "Recent co-travellers are derived from booking history rather than a separate table, so the list can't disagree with what you booked.",
  },
];

export default function Features() {
  const ref = useReveal();
  return (
    <section className="section features" id="features" ref={ref} aria-labelledby="features-title">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">Features</p>
          <h2 id="features-title" className="h2">The parts of a railway booking that are easy to get wrong.</h2>
        </div>

        <div className="bento">
          <article className="bento-card bento-card--wide bento-card--stress reveal">
            <div className="bento-copy">
              <span className="bento-icon"><Icon name="lock" /></span>
              <h3>No double-booking under load</h3>
              <p>
                Checkout locks the coach rows before it re-checks the seat, so simultaneous
                buyers queue instead of racing. The losers get a clear{" "}
                <span className="mono">409</span> and pick again.
              </p>
            </div>
            <StressChart />
          </article>

          <article className="bento-card bento-card--tall reveal" data-delay="1">
            <span className="bento-icon"><Icon name="zap" /></span>
            <h3>Fares the client can't change</h3>
            <p>
              The browser previews a fare from the same config the server uses, but the total
              you pay is recomputed from the timetable inside the transaction.
            </p>
            <div className="fare-card" aria-label="Sleeper fare breakdown for Vijayawada to Chennai, 431 km">
              <div className="fare-row"><span>BZA → MAS · 431 km · SL</span></div>
              <div className="fare-row"><span>Base <em className="mono">431 × ₹0.46</em></span><span className="mono">₹198</span></div>
              <div className="fare-row"><span>Reservation</span><span className="mono">₹30</span></div>
              <div className="fare-row"><span>GST 5%</span><span className="mono">₹11</span></div>
              <div className="fare-row fare-row--total"><span>Total</span><span className="mono">₹239</span></div>
            </div>
          </article>

          {FEATURES.map((f, i) => (
            <article key={f.title} className="bento-card reveal" data-delay={String((i % 3) + 1)}>
              <span className="bento-icon"><Icon name={f.icon} /></span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
