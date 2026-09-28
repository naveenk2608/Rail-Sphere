import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { availability } from "../utils/availability";
import { dayShift, durationLabel, formatDate, formatTime } from "../utils/dates";
import { AvailabilityExplainer } from "./AvailabilityInfo";
import Icon from "./Icon";
import Modal from "./Modal";
import "./TrainDetailsModal.css";

// Everything about one train for the searched journey: timings, classes
// with availability and fare, and the full list of stops.
export default function TrainDetailsModal({ train, fromCode, toCode, boardingDate, departed, onBook, onClose }) {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getTrainRoute(train.train_id)
      .then(setStops)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [train.train_id]);

  const shift = dayShift(train.departure_day_offset, train.arrival_day_offset);
  const duration = durationLabel(train.departure_time, train.arrival_time, train.departure_day_offset, train.arrival_day_offset);

  return (
    <Modal size="lg" onClose={onClose}
      title={<><span className="td-no mono">{train.train_number}</span> {train.train_name}</>}
      subtitle={`${fromCode} → ${toCode} · ${formatDate(boardingDate, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`}>

      <div className="td-journey">
        <div>
          <div className="td-time mono">{formatTime(train.departure_time)}</div>
          <div className="td-stn">{fromCode}</div>
        </div>
        <div className="td-mid">
          <span className="td-line" aria-hidden="true" />
          <span className="td-dur">{duration} · {train.distance} km</span>
        </div>
        <div className="td-right">
          <div className="td-time mono">{formatTime(train.arrival_time)}{shift && <span className="day-shift">{shift}</span>}</div>
          <div className="td-stn">{toCode}</div>
        </div>
      </div>

      <h3 className="td-h">Classes and fares</h3>
      <ul className="td-classes">
        {train.classes.map((c) => {
          const a = availability(c.available_seats, departed);
          return (
            <li key={c.coach_type} className="td-class">
              <div className="td-class-name">
                <span className="mono">{c.coach_type}</span> {c.label}
              </div>
              <div className={`td-class-avail tone-${a.tone}`}>{a.text}</div>
              <div className="td-class-fare mono">₹{c.fare_per_person}<span> / person</span></div>
              <button type="button" className="btn btn--primary btn--sm" disabled={!a.bookable}
                onClick={() => onBook(c.coach_type)}>
                Continue
              </button>
            </li>
          );
        })}
      </ul>

      <details className="td-info">
        <summary><Icon name="info" size={15} /> Availability is calculated for your selected journey. How does that work?</summary>
        <div className="td-info-body"><AvailabilityExplainer /></div>
      </details>

      <h3 className="td-h">Route</h3>
      {loading && <div className="skeleton" style={{ height: 200 }} />}
      {error && <p className="td-error" role="alert">{error}</p>}
      {!loading && !error && (
        <ol className="td-stops">
          {stops.map((stop, i) => {
            const inJourney = stop.seq >= train.from_seq && stop.seq <= train.to_seq;
            const isEnd = stop.seq === train.from_seq || stop.seq === train.to_seq;
            const day = Math.max(stop.arrival_day_offset || 0, stop.departure_day_offset || 0) + 1;
            return (
              // Keyed on seq: a circular route can call at the same station twice.
              <li key={stop.seq} className={`td-stop ${inJourney ? "is-journey" : ""} ${isEnd ? "is-end" : ""} ${stop.seq >= train.from_seq && stop.seq < train.to_seq ? "line-on" : ""}`}>
                <span className="td-stop-dot" aria-hidden="true" />
                <div className="td-stop-name">
                  {stop.station_name} <span className="mono">{stop.station_code}</span>
                  {isEnd && <span className="td-stop-tag">{stop.seq === train.from_seq ? "Board" : "Get off"}</span>}
                </div>
                <div className="td-stop-times mono">
                  <span>{i === 0 ? "Starts" : formatTime(stop.arrival_time)}</span>
                  <span>{i === stops.length - 1 ? "Ends" : formatTime(stop.departure_time)}</span>
                  <span className="td-stop-day">{day > 1 ? `Day ${day}` : ""}</span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Modal>
  );
}
