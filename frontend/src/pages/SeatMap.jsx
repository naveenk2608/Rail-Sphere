import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getUserFromToken } from "../hooks/useAuth";
import { api } from "../utils/api";
import { calculateFare, formatFare, loadClassConfig } from "../utils/fareCalculator";
import "./SeatMap.css";

const MAX_SEATS = 5;

// Indian coaches are laid out as a main bay plus a shorter side bay:
// 8 across is 6 + 2, 6 across is 4 + 2, 4 across has no side berths.
function buildLayout(total, perRow = 8) {
  const main = perRow >= 8 ? 6 : perRow >= 6 ? 4 : perRow;
  const side = Math.max(0, perRow - main);

  const rows = [];
  let seat = 1;
  while (seat <= total) {
    const mainSeats = [];
    for (let i = 0; i < main && seat <= total; i++) mainSeats.push(seat++);
    const sideSeats = [];
    for (let i = 0; i < side && seat <= total; i++) sideSeats.push(seat++);
    rows.push({ key: mainSeats[0], main: mainSeats, side: sideSeats });
  }
  return rows;
}

export default function SeatMap() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const user = getUserFromToken();

  const trainId     = params.get("trainId");
  const trainName   = params.get("trainName");
  const trainNumber = params.get("trainNumber");
  const coachType   = params.get("coachType");
  const date        = params.get("date");
  const distance    = Number(params.get("distance"));
  const fromSeq     = Number(params.get("fromSeq"));
  const toSeq       = Number(params.get("toSeq"));
  const fromCode    = params.get("fromCode");
  const toCode      = params.get("toCode");

  const [coaches,       setCoaches]       = useState([]);
  const [activeCoach,   setActiveCoach]   = useState(null);
  const [bookedSeats,   setBookedSeats]   = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [config,        setConfig]        = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [seatsLoading,  setSeatsLoading]  = useState(false);
  const seatRequestRef = useRef(0);

  useEffect(() => {
    loadClassConfig().then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    api.getCoaches(trainId, coachType)
      .then((data) => { setCoaches(data); if (data.length) setActiveCoach(data[0]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [trainId, coachType]);

  // Guard against out-of-order responses: switching coaches quickly could
  // otherwise leave the previous coach's booked seats on screen.
  useEffect(() => {
    if (!activeCoach) return;
    const requestId = ++seatRequestRef.current;
    setSeatsLoading(true);
    setBookedSeats([]);

    api.getBookedSeats(trainId, activeCoach.coach_id, date, fromSeq, toSeq)
      .then((data) => { if (seatRequestRef.current === requestId) setBookedSeats(data); })
      .catch(() => {})
      .finally(() => { if (seatRequestRef.current === requestId) setSeatsLoading(false); });
  }, [activeCoach, trainId, date, fromSeq, toSeq]);

  function isSelected(coachId, seatNo) {
    return selectedSeats.some((s) => s.coach_id === coachId && s.seat_no === seatNo);
  }

  function toggleSeat(seatNo) {
    if (!activeCoach || seatsLoading) return;
    const coachId = activeCoach.coach_id;

    if (isSelected(coachId, seatNo)) {
      setSelectedSeats(selectedSeats.filter((s) => !(s.coach_id === coachId && s.seat_no === seatNo)));
      return;
    }
    if (selectedSeats.length >= MAX_SEATS) return;
    if (bookedSeats.includes(seatNo)) return;

    setSelectedSeats([...selectedSeats, {
      coach_id: coachId,
      coach_number: activeCoach.coach_number,
      seat_no: seatNo,
    }]);
  }

  function seatState(seatNo) {
    if (bookedSeats.includes(seatNo)) return "booked";
    if (activeCoach && isSelected(activeCoach.coach_id, seatNo)) return "selected";
    return "available";
  }

  function handleContinue() {
    if (!selectedSeats.length) return;

    const next = new URLSearchParams(params);
    next.set("seats", JSON.stringify(selectedSeats));
    const target = `/passengers?${next.toString()}`;

    if (!user) {
      sessionStorage.setItem("bookingProgress", JSON.stringify({ returnPath: target }));
      navigate(`/login?returnTo=${encodeURIComponent(`/seats?${params.toString()}`)}`);
      return;
    }
    navigate(target);
  }

  const fare = calculateFare(config, distance, coachType, selectedSeats.length || 1);
  const layout = activeCoach
    ? buildLayout(activeCoach.total_seats, activeCoach.seats_per_row)
    : [];

  function renderSeat(seatNo) {
    const state = seatState(seatNo);
    return (
      <button
        key={seatNo}
        className={`sm-seat sm-seat--${state}`}
        onClick={() => toggleSeat(seatNo)}
        disabled={state === "booked"}
        aria-label={`Seat ${seatNo}, ${state}`}
      >
        {seatNo}
      </button>
    );
  }

  return (
    <div className="sm-page">
      <div className="sm-topbar">
        <button className="sm-back" onClick={() => navigate(-1)}>← Back</button>
        <div>
          <div className="sm-train-name">{trainName} ({trainNumber})</div>
          <div className="sm-route">{fromCode} → {toCode} · {date} · {coachType}</div>
        </div>
      </div>

      <div className="sm-body">
        {loading ? <div className="sm-loading">Loading coaches…</div> : (
          <>
            <div className="sm-coach-tabs">
              {coaches.map((c) => {
                const count = selectedSeats.filter((s) => s.coach_id === c.coach_id).length;
                return (
                  <button key={c.coach_id}
                    className={`sm-coach-tab ${activeCoach?.coach_id === c.coach_id ? "sm-coach-tab--active" : ""}`}
                    onClick={() => setActiveCoach(c)}>
                    {c.coach_number}
                    {count > 0 && <span className="sm-coach-badge">{count}</span>}
                  </button>
                );
              })}
            </div>

            <div className="sm-legend">
              <span><span className="sm-leg-dot sm-leg-dot--avail" /> Available</span>
              <span><span className="sm-leg-dot sm-leg-dot--sel" /> Selected</span>
              <span><span className="sm-leg-dot sm-leg-dot--booked" /> Booked</span>
            </div>

            <div className="sm-coach-label">
              {activeCoach?.coach_number} — {coachType}
              {seatsLoading && <span className="sm-coach-loading"> · checking availability…</span>}
            </div>

            <div className="sm-grid-wrapper">
              <div className="sm-grid">
                {layout.map((row) => (
                  <div key={row.key} className="sm-row">
                    <div className="sm-main-group">{row.main.map(renderSeat)}</div>
                    {row.side.length > 0 && (
                      <>
                        <div className="sm-aisle" />
                        <div className="sm-side-group">{row.side.map(renderSeat)}</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="sm-bottom">
        <div className="sm-bottom-inner">
          <div className="sm-selected-info">
            {selectedSeats.length === 0
              ? <span className="sm-sel-hint">Select up to {MAX_SEATS} seats</span>
              : <div className="sm-sel-chips">
                  {selectedSeats.map((s) => (
                    <span key={`${s.coach_id}-${s.seat_no}`} className="sm-sel-chip">
                      {s.coach_number}·{s.seat_no}
                    </span>
                  ))}
                </div>
            }
            {selectedSeats.length > 0 && (
              <div className="sm-fare">{formatFare(fare.total)} total</div>
            )}
          </div>
          <button className="sm-continue-btn" onClick={handleContinue}
            disabled={selectedSeats.length === 0}>
            Continue ({selectedSeats.length}) →
          </button>
        </div>
      </div>
    </div>
  );
}
