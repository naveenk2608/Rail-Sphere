import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getUserFromToken, saveBookingProgress } from "../hooks/useAuth";
import Icon from "../components/Icon";
import { useClassConfig } from "../hooks/useClassConfig";
import { api } from "../utils/api";
import { formatDate, stopDate } from "../utils/dates";
import { calculateFare, classDisplay, formatFare, maxSeats } from "../utils/fareCalculator";
import "./SeatMap.css";

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
  // date is the train's run date at its origin; depOffset moves it to the
  // day the passenger boards.
  const date        = params.get("date");
  const depOffset   = Number(params.get("depOffset")) || 0;
  const distance    = Number(params.get("distance"));
  const fromSeq     = Number(params.get("fromSeq"));
  const toSeq       = Number(params.get("toSeq"));
  const fromCode    = params.get("fromCode");
  const toCode      = params.get("toCode");

  const [coaches,       setCoaches]       = useState([]);
  const [activeCoach,   setActiveCoach]   = useState(null);
  const [bookedSeats,   setBookedSeats]   = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [seatsLoading,  setSeatsLoading]  = useState(false);
  const [error,         setError]         = useState("");
  const seatRequestRef = useRef(0);
  const config = useClassConfig();
  const MAX_SEATS = maxSeats(config);

  useEffect(() => {
    api.getCoaches(trainId, coachType)
      .then((data) => { setCoaches(data); if (data.length) setActiveCoach(data[0]); })
      .catch((e) => setError(e.message))
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
      .catch((e) => { if (seatRequestRef.current === requestId) setError(e.message); })
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
      saveBookingProgress(target);
      navigate(`/login?returnTo=${encodeURIComponent(`/seats?${params.toString()}`)}`);
      return;
    }
    navigate(target);
  }

  const fare = calculateFare(config, distance, coachType, selectedSeats.length || 1);
  const layout = activeCoach
    ? buildLayout(activeCoach.total_seats, activeCoach.seats_per_row)
    : [];
  const bookedCount = bookedSeats.length;
  const freeCount = activeCoach ? activeCoach.total_seats - bookedCount : 0;

  function renderSeat(seatNo, side = false) {
    const state = seatState(seatNo);
    return (
      <button
        key={seatNo}
        type="button"
        className={`sm-seat sm-seat--${state} ${side ? "sm-seat--side" : ""}`}
        onClick={() => toggleSeat(seatNo)}
        disabled={state === "booked"}
        aria-pressed={state === "selected"}
        aria-label={`Seat ${seatNo}${side ? ", side berth" : ""}, ${state}`}
      >
        {seatNo}
      </button>
    );
  }

  return (
    <div className="sm-page">
      <header className="page-head">
        <div className="page-head-inner">
          <button type="button" className="page-back" onClick={() => navigate(-1)} aria-label="Back to results">
            <Icon name="arrow" size={17} className="flip" />
          </button>
          <div>
            <h1 className="page-title">{trainName} <span className="sm-train-no mono">{trainNumber}</span></h1>
            <p className="page-sub">
              {fromCode} → {toCode} · {formatDate(stopDate(date, depOffset))} · {classDisplay(config, coachType)}
            </p>
          </div>
        </div>
      </header>

      <div className="page-body sm-layout">
        <section className="sm-main" aria-label="Choose seats">
          {error && <div className="state state--error" role="alert"><span className="state-icon"><Icon name="alert" size={22} /></span>{error}</div>}
          {loading ? (
            <div className="sm-card"><div className="skeleton" style={{ height: 36, width: 220 }} /><div className="skeleton" style={{ height: 320, marginTop: 20 }} /></div>
          ) : error ? null : coaches.length === 0 ? (
            <div className="state"><span className="state-icon"><Icon name="seat" size={22} /></span>No {coachType} coaches on this train.</div>
          ) : (
            <div className="sm-card">
              <div className="sm-card-head">
                <div className="sm-coach-tabs" role="tablist" aria-label="Coaches">
                  {coaches.map((c) => {
                    const count = selectedSeats.filter((s) => s.coach_id === c.coach_id).length;
                    const activeTab = activeCoach?.coach_id === c.coach_id;
                    return (
                      <button key={c.coach_id} type="button" role="tab" aria-selected={activeTab}
                        className={`sm-coach-tab ${activeTab ? "sm-coach-tab--active" : ""}`}
                        onClick={() => setActiveCoach(c)}>
                        <span className="mono">{c.coach_number}</span>
                        {count > 0 && <span className="sm-coach-badge" aria-label={`${count} selected`}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="sm-legend" aria-hidden="true">
                  <span><i className="sm-leg sm-leg--avail" /> Available</span>
                  <span><i className="sm-leg sm-leg--sel" /> Selected</span>
                  <span><i className="sm-leg sm-leg--booked" /> Taken for {fromCode}→{toCode}</span>
                </div>
              </div>

              <div className="sm-coach-meta">
                <span>Coach <b className="mono">{activeCoach?.coach_number}</b> · {classDisplay(config, coachType)}</span>
                <span aria-live="polite">
                  {seatsLoading ? "Checking availability…" : `${freeCount} of ${activeCoach?.total_seats} free for this stretch`}
                </span>
              </div>

              <div className="sm-grid-wrapper">
                <div className={`sm-coach ${seatsLoading ? "is-loading" : ""}`}>
                  <div className="sm-coach-end" aria-hidden="true">Engine side</div>
                  <div className="sm-grid">
                    {layout.map((row) => (
                      <div key={row.key} className="sm-row">
                        <div className="sm-main-group">{row.main.map((n) => renderSeat(n))}</div>
                        {row.side.length > 0 && (
                          <>
                            <div className="sm-aisle" aria-hidden="true" />
                            <div className="sm-side-group">{row.side.map((n) => renderSeat(n, true))}</div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="sm-summary" aria-label="Your selection">
          <div className="sm-summary-card">
            <div className="sm-summary-trip">
              <div>
                <div className="sm-summary-code mono">{fromCode}</div>
                <div className="sm-summary-time mono">{params.get("dep")}</div>
              </div>
              <span className="sm-summary-line" aria-hidden="true" />
              <div className="sm-summary-right">
                <div className="sm-summary-code mono">{toCode}</div>
                <div className="sm-summary-time mono">{params.get("arr")}</div>
              </div>
            </div>

            <div className="sm-selected-info">
              <div className="sm-summary-label">Seats <span>{selectedSeats.length}/{MAX_SEATS}</span></div>
              {selectedSeats.length === 0
                ? <span className="sm-sel-hint">Pick up to {MAX_SEATS} seats, across coaches if you like.</span>
                : <div className="sm-sel-chips">
                    {selectedSeats.map((s) => (
                      <span key={`${s.coach_id}-${s.seat_no}`} className="sm-sel-chip mono">
                        {s.coach_number}·{s.seat_no}
                      </span>
                    ))}
                  </div>
              }
            </div>

            {selectedSeats.length > 0 && (
              <dl className="sm-fare-rows">
                <div><dt>Base fare</dt><dd className="mono">{formatFare(fare.base)}</dd></div>
                <div><dt>Reservation</dt><dd className="mono">{formatFare(fare.reservation)}</dd></div>
                <div><dt>GST</dt><dd className="mono">{formatFare(fare.gst)}</dd></div>
                <div className="sm-fare-total"><dt>Estimated total</dt><dd className="mono">{formatFare(fare.total)}</dd></div>
              </dl>
            )}

            <button type="button" className="btn btn--primary btn--lg sm-continue-btn" onClick={handleContinue}
              disabled={selectedSeats.length === 0}>
              {selectedSeats.length === 0 ? "Select a seat" : `Continue with ${selectedSeats.length} ${selectedSeats.length === 1 ? "seat" : "seats"}`}
              <Icon name="arrow" />
            </button>
            {!user && selectedSeats.length > 0 && <p className="sm-note">You'll log in next; your selection is kept (seats aren't held until you confirm).</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
