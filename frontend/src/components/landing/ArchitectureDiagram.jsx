import Icon from "../Icon";
import "./ArchitectureDiagram.css";

// The deployed system: SPA on Vercel, Express on Render, MySQL on Aiven,
// Gmail SMTP for tickets. The dashes along each link animate in the
// direction requests travel.
const NODES = [
  { id: "web", icon: "globe", title: "Web app", host: "Vercel", lines: ["React 18 · Vite", "React Router", "JWT in localStorage"] },
  { id: "api", icon: "server", title: "REST API", host: "Render", lines: ["Node · Express", "bcrypt · JWT auth", "17 endpoints"] },
  { id: "db",  icon: "database", title: "MySQL 8", host: "Aiven", lines: ["8 tables · InnoDB", "row locks per coach", "TLS when CA is set"] },
  { id: "mail", icon: "mail", title: "E-tickets", host: "Gmail", lines: ["Nodemailer over SMTP", "escaped HTML ticket"] },
];

export default function ArchitectureDiagram() {
  const [web, api, db, mail] = NODES;
  const node = (n) => (
    <div className={`arch-node arch-node--${n.id}`}>
      <div className="arch-node-head">
        <span className="arch-node-icon"><Icon name={n.icon} size={16} /></span>
        <span className="arch-node-title">{n.title}</span>
        <span className="arch-node-host mono">{n.host}</span>
      </div>
      <ul>{n.lines.map((l) => <li key={l}>{l}</li>)}</ul>
    </div>
  );

  return (
    <div className="arch" role="img" aria-label="Architecture: the React web app on Vercel calls the Express REST API on Render over HTTPS with a JWT. The API reads and writes a MySQL 8 database on Aiven and sends e-tickets through Gmail SMTP.">
      {node(web)}
      <div className="arch-link" aria-hidden="true">
        <span className="arch-link-label mono">HTTPS · JWT</span>
        <span className="arch-link-line" />
      </div>
      {node(api)}
      <div className="arch-branch" aria-hidden="true">
        <div className="arch-link arch-link--small">
          <span className="arch-link-label mono">mysql2 pool</span>
          <span className="arch-link-line" />
        </div>
        <div className="arch-link arch-link--small">
          <span className="arch-link-label mono">SMTP</span>
          <span className="arch-link-line arch-link-line--slow" />
        </div>
      </div>
      <div className="arch-stack">
        {node(db)}
        {node(mail)}
      </div>
    </div>
  );
}
