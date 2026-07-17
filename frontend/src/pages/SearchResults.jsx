import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import RouteModal from "../components/RouteModal";
import { api } from "../utils/api";
import "./SearchResults.css";

function fmtTime(t) { return t ? t.slice(0,5) : "—"; }

function duration(dep, arr) {
  if (!dep || !arr) return "—";
  const [dh, dm] = dep.split(":").map(Number);
  const [ah, am] = arr.split(":").map(Number);
  let mins = (ah * 60 + am) - (dh * 60 + dm);
  if (mins < 0) mins += 24 * 60;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
function hasDeparted(journeyDate, departureTime) {
  if (!journeyDate || !departureTime) return false;
  const [y, m, d] = journeyDate.split("-").map(Number);
  const [h, min, s] = departureTime.split(":").map(Number);
  const departureDateTime = new Date(y, m - 1, d, h, min, s || 0);
  return departureDateTime <= new Date();
}
const CLASS_LABEL = { SL: "Sleeper", "3A": "3rd AC", "2A": "2nd AC", "1A": "1st AC" };
const CLASS_ORDER = ["SL", "3A", "2A", "1A"];

export default function SearchResults() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const fromId     = params.get("fromId");
  const toId       = params.get("toId");
  const date       = params.get("date");
  const cls        = params.get("cls") || "ALL";
  const fromName   = params.get("fromName");
  const fromCode   = params.get("fromCode");
  const toName     = params.get("toName");
  const toCode     = params.get("toCode");

  const [trains,  setTrains]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [route,   setRoute]   = useState(null); // { trainId, trainName, fromSeq, toSeq }

  useEffect(() => {
    setLoading(true);
    api.searchTrains({ fromId, toId, date, cls })
      .then(setTrains)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [fromId, toId, date, cls]);

  function handleClassSelect(train, coachType) {
    navigate(`/seats?trainId=${train.train_id}&trainName=${encodeURIComponent(train.train_name)}&trainNumber=${train.train_number}&coachType=${coachType}&date=${date}&fromId=${fromId}&toId=${toId}&fromSeq=${train.from_seq}&toSeq=${train.to_seq}&distance=${train.distance}&fromCode=${fromCode}&toCode=${toCode}&dep=${encodeURIComponent(fmtTime(train.departure_time))}&arr=${encodeURIComponent(fmtTime(train.arrival_time))}`);
  }

  const displayDate = new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="sr-page">
      {/* Top bar */}
      <div className="sr-topbar">
        <div className="sr-topbar-inner">
          <button className="sr-back" onClick={() => navigate("/")}>← Back</button>
          <div className="sr-route-info">
            <span className="sr-route-main">{fromCode} → {toCode}</span>
            <span className="sr-route-sub">{fromName} to {toName} · {displayDate} · {cls === "ALL" ? "All Classes" : CLASS_LABEL[cls]}</span>
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
            <div className="sr-empty-sub">No trains run between {fromCode} and {toCode} on this date. Try a different date.</div>
          </div>
        )}

        {trains.map((train) => (
          <div key={train.train_id} className="sr-card">
            <div className="sr-card-top">
              <div className="sr-train-info">
                <div className="sr-train-name">{train.train_name}</div>
                <div className="sr-train-no">{train.train_number}</div>
              </div>
              <div className="sr-timing">
                <div className="sr-time-block">
                  <div className="sr-time">{fmtTime(train.departure_time)}</div>
                  <div className="sr-stn">{fromCode}</div>
                </div>
                <div className="sr-dur-block">
                  <div className="sr-dur-line" />
                  <div className="sr-dur">{duration(train.departure_time, train.arrival_time)}</div>
                </div>
                <div className="sr-time-block sr-time-block--right">
                  <div className="sr-time">{fmtTime(train.arrival_time)}</div>
                  <div className="sr-stn">{toCode}</div>
                </div>
              </div>
              <button className="sr-view-route" onClick={() => setRoute({ trainId: train.train_id, trainName: `${train.train_number} · ${train.train_name}`, fromSeq: train.from_seq, toSeq: train.to_seq })}>
                View route ↓
              </button>
            </div>

            {/* Class chips */}
            <div className="sr-classes">
              {CLASS_ORDER.filter((ct) => cls === "ALL" || ct === cls).map((ct) => {
                const info = train.classes.find((c) => c.coach_type === ct);
                if (!info) return null;
                const avail    = info.available_seats;
                const departed = hasDeparted(date, train.departure_time);
                const disabled = avail === 0 || departed;
                return (
                  <button
                    key={ct}
                    className={`sr-class-chip ${disabled ? "sr-class-chip--full" : ""}`}
                    disabled={disabled}
                    onClick={() => !disabled && handleClassSelect(train, ct)}
                  >
                    <span className="sr-chip-type">{ct}</span>
                    <span className="sr-chip-seats">
                      {departed ? "Departed" : avail > 0 ? `${avail} seats` : "Full"}
                    </span>
                    <span className="sr-chip-fare">₹ {info.fare_per_person}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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