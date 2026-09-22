import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import RouteModal from "../components/RouteModal";
import { api } from "../utils/api";
import { formatDate, formatTime, durationLabel, hasDeparted, dayShift } from "../utils/dates";
import "./SearchResults.css";

export default function SearchResults() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

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
  const [route,   setRoute]   = useState(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    api.searchTrains({ fromId, toId, date, cls })
      .then(setTrains)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [fromId, toId, date, cls]);

  function handleClassSelect(train, coachType) {
    const next = new URLSearchParams({
      trainId: train.train_id,
      trainName: train.train_name,
      trainNumber: train.train_number,
      coachType,
      date,
      fromId, toId, fromCode, toCode,
      fromSeq: train.from_seq,
      toSeq: train.to_seq,
      distance: train.distance,
      dep: formatTime(train.departure_time),
      arr: formatTime(train.arrival_time),
    });
    navigate(`/seats?${next.toString()}`);
  }

  const displayDate = formatDate(date, {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="sr-page">
      <div className="sr-topbar">
        <div className="sr-topbar-inner">
          <button className="sr-back" onClick={() => navigate("/")}>← Back</button>
          <div className="sr-route-info">
            <span className="sr-route-main">{fromCode} → {toCode}</span>
            <span className="sr-route-sub">
              {fromName} to {toName} · {displayDate} · {cls === "ALL" ? "All Classes" : cls}
            </span>
          </div>
        </div>
      </div>

      <div className="sr-body">
        {loading && <div className="sr-state">Searching trains…</div>}
        {error   && <div className="sr-state sr-state--error">{error}</div>}

        {!loading && !error && trains.length === 0 && (
          <div className="sr-empty">
            <div className="sr-empty-icon">🚉</div>
            <div className="sr-empty-title">No trains found</div>
            <div className="sr-empty-sub">
              No trains run between {fromCode} and {toCode} on this date. Try a different date.
            </div>
          </div>
        )}

        {trains.map((train) => {
          const departed = hasDeparted(date, train.departure_time, train.departure_day_offset);
          return (
            <div key={train.train_id} className="sr-card">
              <div className="sr-card-top">
                <div className="sr-train-info">
                  <div className="sr-train-name">{train.train_name}</div>
                  <div className="sr-train-no">{train.train_number}</div>
                </div>

                <div className="sr-timing">
                  <div className="sr-time-block">
                    <div className="sr-time">{formatTime(train.departure_time)}</div>
                    <div className="sr-stn">{fromCode}</div>
                  </div>
                  <div className="sr-dur-block">
                    <div className="sr-dur-line" />
                    <div className="sr-dur">
                      {durationLabel(
                        train.departure_time, train.arrival_time,
                        train.departure_day_offset, train.arrival_day_offset
                      )}
                    </div>
                  </div>
                  <div className="sr-time-block sr-time-block--right">
                    <div className="sr-time">
                      {formatTime(train.arrival_time)}
                      {dayShift(train.departure_day_offset, train.arrival_day_offset) && (
                        <span className="day-shift">
                          {dayShift(train.departure_day_offset, train.arrival_day_offset)}
                        </span>
                      )}
                    </div>
                    <div className="sr-stn">{toCode}</div>
                  </div>
                </div>

                <button className="sr-view-route"
                  onClick={() => setRoute({
                    trainId: train.train_id,
                    trainName: `${train.train_number} · ${train.train_name}`,
                    fromSeq: train.from_seq,
                    toSeq: train.to_seq,
                  })}>
                  View route ↓
                </button>
              </div>

              <div className="sr-classes">
                {train.classes.map((info) => {
                  const disabled = info.available_seats === 0 || departed;
                  return (
                    <button
                      key={info.coach_type}
                      className={`sr-class-chip ${disabled ? "sr-class-chip--full" : ""}`}
                      disabled={disabled}
                      onClick={() => !disabled && handleClassSelect(train, info.coach_type)}
                      title={info.label}
                    >
                      <span className="sr-chip-type">{info.coach_type}</span>
                      <span className="sr-chip-seats">
                        {departed ? "Departed" : info.available_seats > 0
                          ? `${info.available_seats} seats` : "Full"}
                      </span>
                      <span className="sr-chip-fare">₹ {info.fare_per_person}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {route && (
        <RouteModal
          trainId={route.trainId}
          trainName={route.trainName}
          fromSeq={route.fromSeq}
          toSeq={route.toSeq}
          onClose={() => setRoute(null)}
        />
      )}
    </div>
  );
}
