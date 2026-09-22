const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// Passenger names are user input and land in an HTML document.
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtTime(t) {
  return t ? String(t).slice(0, 5) : "—";
}

function fmtDate(d) {
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? "—" : date.toDateString();
}

function genderLabel(g) {
  if (g === "M") return "Male";
  if (g === "F") return "Female";
  return "Other";
}

async function sendTicketEmail(toEmail, booking) {
  const passengerRows = booking.passengers
    .map(
      (p, i) => `
      <tr style="background:${i % 2 === 0 ? "#f9fbfd" : "#ffffff"}">
        <td style="padding:8px 12px">${esc(p.passenger_name)}</td>
        <td style="padding:8px 12px">${esc(p.age)}</td>
        <td style="padding:8px 12px">${esc(genderLabel(p.gender))}</td>
        <td style="padding:8px 12px">${esc(p.coach_number)} · ${esc(p.seat_no)}</td>
      </tr>`
    )
    .join("");

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e0eaf4;border-radius:12px;overflow:hidden">
    <div style="background:#185fa5;padding:24px;color:#fff">
      <h2 style="margin:0 0 4px">🚆 Rail-Sphere — E-Ticket</h2>
      <p style="margin:0;opacity:0.85;font-size:13px">Booking Confirmed</p>
    </div>
    <div style="padding:24px">
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px">PNR</td>
          <td style="padding:6px 0;font-weight:700;font-size:16px;letter-spacing:1px">${esc(booking.pnr)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px">Train</td>
          <td style="padding:6px 0;font-weight:600">${esc(booking.train_number)} · ${esc(booking.train_name)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px">Class</td>
          <td style="padding:6px 0;font-weight:600">${esc(booking.coach_type)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px">From</td>
          <td style="padding:6px 0;font-weight:600">${esc(booking.source_name)} (${esc(booking.source_code)}) — ${esc(fmtTime(booking.departure_time))}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px">To</td>
          <td style="padding:6px 0;font-weight:600">${esc(booking.dest_name)} (${esc(booking.dest_code)}) — ${esc(fmtTime(booking.arrival_time))}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px">Date</td>
          <td style="padding:6px 0;font-weight:600">${esc(fmtDate(booking.journey_date))}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px">Total Paid</td>
          <td style="padding:6px 0;font-weight:700;color:#185fa5;font-size:16px">₹ ${esc(booking.total_amount)}</td>
        </tr>
      </table>

      <h3 style="font-size:14px;margin-bottom:8px;color:#1a1a2e">Passengers</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#e6f1fb">
            <th style="padding:8px 12px;text-align:left;color:#0c447c">Name</th>
            <th style="padding:8px 12px;text-align:left;color:#0c447c">Age</th>
            <th style="padding:8px 12px;text-align:left;color:#0c447c">Gender</th>
            <th style="padding:8px 12px;text-align:left;color:#0c447c">Seat</th>
          </tr>
        </thead>
        <tbody>${passengerRows}</tbody>
      </table>
    </div>
    <div style="background:#f7f9fb;padding:14px 24px;font-size:12px;color:#9ca3af;text-align:center">
      Rail-Sphere · Have a safe journey!
    </div>
  </div>`;

  await transporter.sendMail({
    from:    `"Rail-Sphere" <${process.env.GMAIL_USER}>`,
    to:      toEmail,
    subject: `Your ticket — PNR ${booking.pnr}`,
    html,
  });
}

module.exports = { sendTicketEmail };
