import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import AvailabilityInfo from "../components/AvailabilityInfo";
import TrainDetailsModal from "../components/TrainDetailsModal";
import { useClassConfig } from "../hooks/useClassConfig";
import { api } from "../utils/api";
import { availability } from "../utils/availability";
import { classDisplay } from "../utils/fareCalculator";
import { formatDate, formatTime, durationLabel, hasDeparted, dayShift, parseLocalDate, toDateString } from "../utils/dates";
import "./SearchResults.css";

// A week of boarding dates around the one searched, never before today.
function dateStrip(dateStr) {
  const base = parseLocalDate(dateStr) || new Date();
  const today = parseLocalDate(toDateString());
  const days = [];
  for (let offset = -3; offset <= 3; offset++) {
    const d = new Date(base);
    d.setDate(d.getDate() + offset);
    if (d < today) continue;
    days.push(d);
  }
  while (days.length < 7) {
    const last = new Date(days[days.length - 1]);
    last.setDate(last.getDate() + 1);
    days.push(last);
  }
  return days;
}

function SkeletonCard() {
  return (
    <div className="sr-card sr-card--skeleton" aria-hidden="true">
      <div className="skeleton" style={{ width: 220, height: 18 }} />
      <div className="skeleton" style={{ width: "100%", height: 34, marginTop: 20 }} />
      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ width: 120, height: 64 }} />)}
      </div>
    </div>
  );
}

export default function SearchResults() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const config = useClassConfig();

  const fromId   = params.get("fromId");
  const toId     = params.get("toId");
  const date     = params.get("date");
  const cls      = params.get("cls") || "ALL";
  const fromName = params.get("fromName");
  const fromCode = params.get("fromCode");
  const toName   = params.get("toName");
  const toCode   = params.get("toCode");

  const [trains,  setTrains]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [details, setDetails] = useState(null);
  // Class picked on each card, keyed by train id.
  const [picked,  setPicked]  = useState({});
  const datesRef = useRef(null);

  // Keep the selected day visible in the strip on narrow screens. Scrolls
  // the strip only, never the page.
  useEffect(() => {
    const strip = datesRef.current;
    const active = strip?.querySelector(".is-active");
    if (strip && active) strip.scrollLeft = active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2;
  }, [date]);

  useEffect(() => {
    setLoading(true);
    setError("");
    api.searchTrains({ fromId, toId, date, cls })
      .then(setTrains)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [fromId, toId, date, cls]);

  // `date` is the boarding date the user searched for. The seat map and the
  // booking need the train's run date at its origin (journey_date), plus the
  // day offsets to show boarding and arrival dates correctly.
  function handleClassSelect(train, coachType) {
    const next = new URLSearchParams({
      trainId: train.train_id,
      trainName: train.train_name,
      trainNumber: train.train_number,
      coachType,
      date: train.journey_date,
      depOffset: train.departure_day_offset,
      arrOffset: train.arrival_day_offset,
      fromId, toId, fromCode, toCode,
      fromSeq: train.from_seq,
      toSeq: train.to_seq,
      distance: train.distance,
      dep: formatTime(train.departure_time),
      arr: formatTime(train.arrival_time),
    });
    navigate(`/seats?${next.toString()}`);
  }

  function changeDate(d) {
    const next = new URLSearchParams(params);
    next.set("date", toDateString(d));
    navigate(`/search?${next.toString()}`, { replace: true });
  }

  const displayDate = formatDate(date, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const days = dateStrip(date);

  return (
    <div className="sr-page">
      <header className="page-head">
        <div className="page-head-inner">
          <button type="button" className="page-back" onClick={() => navigate("/")} aria-label="Back to search">
            <Icon name="arrow" size={17} className="flip" />
          </button>
          <div className="sr-route-info">
            <h1 className="sr-route-main mono">
              {fromCode} <Icon name="arrow" size={18} /> {toCode}
            </h1>
            <p className="page-sub">
              {fromName} to {toName} · {displayDate} · {cls === "ALL" ? "All classes" : classDisplay(config, cls)}
            </p>
          </div>
        </div>
        <div className="sr-dates-wrap">
          <nav className="sr-dates" aria-label="Boarding date" ref={datesRef}>
            {days.map((d) => {
              const value = toDateString(d);
              const active = value === date;
              return (
                <button key={value} type="button" className={`sr-date ${active ? "is-active" : ""}`}
                  aria-current={active ? "date" : undefined} onClick={() => !active && changeDate(d)}>
                  <span className="sr-date-wd">{d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                  <span className="sr-date-day">{d.getDate()} {d.toLocaleDateString("en-IN", { month: "short" })}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="page-body sr-body">
        {loading && (
          <div aria-busy="true" aria-label="Searching trains">
            <SkeletonCard /><SkeletonCard />
          </div>
        )}

        {!loading && error && (
          <div className="state state--error" role="alert">
            <span className="state-icon"><Icon name="alert" size={22} /></span>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && trains.length === 0 && (
          <div className="state">
            <span className="state-icon"><Icon name="train" size={22} /></span>
            <span className="state-title">No trains on this date</span>
            <span>Nothing runs from {fromCode} to {toCode} on {displayDate}. Try another day above.</span>
          </div>
        )}

        {!loading && !error && trains.length > 0 && (
          <div className="sr-count">
            <span>{trains.length} {trains.length === 1 ? "train" : "trains"} found</span>
            <AvailabilityInfo />
          </div>
        )}

        {!loading && trains.map((train) => {
          const departed = hasDeparted(train.journey_date, train.departure_time, train.departure_day_offset);
          const shift = dayShift(train.departure_day_offset, train.arrival_day_offset);
          // Default to the class the user searched for, else the first one with seats.
          const fallback = train.classes.find((c) => c.coach_type === cls && c.available_seats > 0)
            || train.classes.find((c) => c.available_seats > 0) || train.classes[0];
          const chosen = train.classes.find((c) => c.coach_type === picked[train.train_id]) || fallback;
          const chosenAvail = chosen ? availability(chosen.available_seats, departed) : null;
          return (
            <article key={train.train_id} className={`sr-card ${departed ? "sr-card--departed" : ""}`}>
              <div className="sr-card-top">
                <div className="sr-train-info">
                  <span className="sr-train-no mono">{train.train_number}</span>
                  <h2 className="sr-train-name">{train.train_name}</h2>
                  {departed && <span className="sr-departed">Departed</span>}
                </div>
              </div>

              <div className="sr-timing">
                <div className="sr-time-block">
                  <div className="sr-time mono">{formatTime(train.departure_time)}</div>
                  <div className="sr-stn"><span className="sr-stn-name">{fromName || fromCode}</span> <span className="mono">{fromCode}</span></div>
                </div>
                <div className="sr-dur-block">
                  <div className="sr-dur-line" aria-hidden="true"><i /><i /></div>
                  <div className="sr-dur">
                    {durationLabel(train.departure_time, train.arrival_time, train.departure_day_offset, train.arrival_day_offset)}
                  </div>
                </div>
                <div className="sr-time-block sr-time-block--right">
                  <div className="sr-time mono">
                    {formatTime(train.arrival_time)}
                    {shift && <span className="day-shift" title="Arrives the next day">{shift}</span>}
                  </div>
                  <div className="sr-stn"><span className="sr-stn-name">{toName || toCode}</span> <span className="mono">{toCode}</span></div>
                </div>
              </div>

              <div className="sr-classes" role="radiogroup" aria-label={`Class on ${train.train_name}`}>
                {train.classes.map((info) => {
                  const a = availability(info.available_seats, departed);
                  const isChosen = chosen?.coach_type === info.coach_type;
                  return (
                    <button
                      key={info.coach_type}
                      type="button"
                      role="radio"
                      aria-checked={isChosen}
                      className={`sr-class-chip ${isChosen ? "is-chosen" : ""} ${a.bookable ? "" : "sr-class-chip--full"}`}
                      onClick={() => setPicked((p) => ({ ...p, [train.train_id]: info.coach_type }))}
                    >
                      <span className="sr-chip-top">
                        <span className="sr-chip-label">{info.label}</span>
                        <span className="sr-chip-type mono">{info.coach_type}</span>
                      </span>
                      <span className={`sr-chip-seats tone-${a.tone}`}>{a.text}</span>
                      <span className="sr-chip-fare mono">₹{info.fare_per_person}</span>
                    </button>
                  );
                })}
              </div>

              <div className="sr-card-foot">
                <div className="sr-foot-fare">
                  {chosen && <>
                    <span className="mono">₹{chosen.fare_per_person}</span>
                    <span>per person · {chosen.label}</span>
                  </>}
                </div>
                <div className="sr-foot-actions">
                  <button type="button" className="btn btn--secondary" onClick={() => setDetails(train)}>
                    View details
                  </button>
                  <button type="button" className="btn btn--primary" disabled={!chosenAvail?.bookable}
                    onClick={() => handleClassSelect(train, chosen.coach_type)}>
                    Book now <Icon name="arrow" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {details && (
        <TrainDetailsModal
          train={details}
          fromCode={fromCode}
          toCode={toCode}
          boardingDate={date}
          departed={hasDeparted(details.journey_date, details.departure_time, details.departure_day_offset)}
          onBook={(coachType) => handleClassSelect(details, coachType)}
          onClose={() => setDetails(null)}
        />
      )}
    </div>
  );
}
