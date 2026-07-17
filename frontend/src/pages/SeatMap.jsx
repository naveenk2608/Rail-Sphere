import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getUserFromToken } from "../hooks/useAuth";
import { api } from "../utils/api";
import { calculateFare, formatFare } from "../utils/fareCalculator";
import "./SeatMap.css";

const MAX_SEATS = 5;

// Build seat layout: rows of { left: seatNo, right: [seatNo, seatNo, seatNo] }
function buildLayout(total) {
  const rows = [];
  let seat = 1;
  while (seat <= total) {
    const left  = seat;
    const right = [seat + 1, seat + 2, seat + 3].filter((s) => s <= total);
    rows.push({ left, right });
    seat += 4;
  }
  return rows;
}

export default function SeatMap() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const user      = getUserFromToken();

  const trainId     = params.get("trainId");
  const trainName   = params.get("trainName");
  const trainNumber = params.get("trainNumber");
  const coachType   = params.get("coachType");
  const date        = params.get("date");
  const fromId      = params.get("fromId");
  const toId        = params.get("toId");
  const fromSeq     = Number(params.get("fromSeq"));
  const toSeq       = Number(params.get("toSeq"));
  const distance    = Number(params.get("distance"));
  const fromCode    = params.get("fromCode");
  const toCode      = params.get("toCode");
  const dep         = params.get("dep");
  const arr         = params.get("arr");

  const [coaches,      setCoaches]      = useState([]);
  const [activeCoach,  setActiveCoach]  = useState(null);
  const [bookedSeats,  setBookedSeats]  = useState([]);
  const [selectedSeats,setSelectedSeats]= useState([]); // [{ coach_id, coach_number, seat_no }]
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    api.getCoaches(trainId, coachType)
      .then((data) => { setCoaches(data); if (data.length) setActiveCoach(data[0]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [trainId, coachType]);

  useEffect(() => {
    if (!activeCoach) return;
    api.getBookedSeats(trainId, activeCoach.coach_id, date, fromSeq, toSeq)
      .then(setBookedSeats)
      .catch(() => {});
  }, [activeCoach]);

  function toggleSeat(seatNo) {
    const alreadySelected = selectedSeats.find(
      (s) => s.coach_id === activeCoach.coach_id && s.seat_no === seatNo
    );
    if (alreadySelected) {
      setSelectedSeats(selectedSeats.filter((s) => !(s.coach_id === activeCoach.coach_id && s.seat_no === seatNo)));
      return;
    }
    if (selectedSeats.length >= MAX_SEATS) return;
    if (bookedSeats.includes(seatNo)) return;
    setSelectedSeats([...selectedSeats, { coach_id: activeCoach.coach_id, coach_number: activeCoach.coach_number, seat_no: seatNo }]);
  }

  function getSeatState(seatNo) {
    if (bookedSeats.includes(seatNo)) return "booked";
    if (selectedSeats.find((s) => s.coach_id === activeCoach.coach_id && s.seat_no === seatNo)) return "selected";
    return "available";
  }

  function handleContinue() {
    if (!selectedSeats.length) return;
    if (!user) {
      sessionStorage.setItem("bookingProgress", JSON.stringify({
        returnPath: `/passengers?${params.toString()}&seats=${encodeURIComponent(JSON.stringify(selectedSeats))}`,
      }));
      navigate(`/login?returnTo=/seats?${params.toString()}`);
      return;
    }
    navigate(`/passengers?trainId=${trainId}&trainName=${encodeURIComponent(trainName)}&trainNumber=${trainNumber}&coachType=${coachType}&date=${date}&fromId=${fromId}&toId=${toId}&fromSeq=${fromSeq}&toSeq=${toSeq}&distance=${distance}&fromCode=${fromCode}&toCode=${toCode}&dep=${encodeURIComponent(dep)}&arr=${encodeURIComponent(arr)}&seats=${encodeURIComponent(JSON.stringify(selectedSeats))}`);
  }

  const fare = calculateFare(distance, coachType, selectedSeats.length || 1);
  const layout = activeCoach ? buildLayout(activeCoach.total_seats) : [];

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
        {/* Coach tabs */}
        {loading ? <div className="sm-loading">Loading coaches…</div> : (
          <>
            <div className="sm-coach-tabs">
              {coaches.map((c) => (
                <button key={c.coach_id}
                  className={`sm-coach-tab ${activeCoach?.coach_id === c.coach_id ? "sm-coach-tab--active" : ""}`}
                  onClick={() => setActiveCoach(c)}>
                  {c.coach_number}
                  {selectedSeats.filter((s) => s.coach_id === c.coach_id).length > 0 && (
                    <span className="sm-coach-badge">
                      {selectedSeats.filter((s) => s.coach_id === c.coach_id).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="sm-legend">
              <span><span className="sm-leg-dot sm-leg-dot--avail" /> Available</span>
              <span><span className="sm-leg-dot sm-leg-dot--sel" /> Selected</span>
              <span><span className="sm-leg-dot sm-leg-dot--booked" /> Booked</span>
            </div>

            {/* Seat grid */}
            <div className="sm-coach-label">{activeCoach?.coach_number} — {coachType}</div>
            <div className="sm-grid-wrapper">
              <div className="sm-grid">
                <div className="sm-grid-header">
                  <span>Window</span>
                  <span className="sm-aisle-label">← Aisle →</span>
                  <span>Middle · Aisle · Window</span>
                </div>
                {layout.map(({ left, right }) => (
                  <div key={left} className="sm-row">
                    <button
                      className={`sm-seat sm-seat--${getSeatState(left)}`}
                      onClick={() => getSeatState(left) !== "booked" && toggleSeat(left)}
                      disabled={getSeatState(left) === "booked"}
                    >
                      {left}
                    </button>
                    <div className="sm-aisle" />
                    <div className="sm-right-group">
                      {right.map((sn) => (
                        <button key={sn}
                          className={`sm-seat sm-seat--${getSeatState(sn)}`}
                          onClick={() => getSeatState(sn) !== "booked" && toggleSeat(sn)}
                          disabled={getSeatState(sn) === "booked"}
                        >
                          {sn}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom bar */}
      <div className="sm-bottom">
        <div className="sm-bottom-inner">
          <div className="sm-selected-info">
            {selectedSeats.length === 0
              ? <span className="sm-sel-hint">Select up to {MAX_SEATS} seats</span>
              : <div className="sm-sel-chips">
                  {selectedSeats.map((s) => (
                    <span key={`${s.coach_id}-${s.seat_no}`} className="sm-sel-chip">
                      {s.coach_number}·{s.seat_no} ×
                    </span>
                  ))}
                </div>
            }
            {selectedSeats.length > 0 && (
              <div className="sm-fare">{formatFare(fare.total)} total</div>
            )}
          </div>
          <button className="sm-continue-btn" onClick={handleContinue} disabled={selectedSeats.length === 0}>
            Continue ({selectedSeats.length}) →
          </button>
        </div>
      </div>
    </div>
  );
}