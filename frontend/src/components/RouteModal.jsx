import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { formatTime } from "../utils/dates";
import "./RouteModal.css";

export default function RouteModal({ trainId, trainName, fromSeq, toSeq, onClose }) {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTrainRoute(trainId)
      .then(setStops)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [trainId]);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="rm-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="rm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rm-header">
          <div>
            <div className="rm-title">Train Route</div>
            <div className="rm-subtitle">{trainName}</div>
          </div>
          <button className="rm-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="rm-legend">
          <span className="rm-legend-dot rm-legend-dot--blue" /> Your journey segment
        </div>

        {loading ? (
          <div className="rm-loading">Loading route…</div>
        ) : (
          <div className="rm-stops">
            {stops.map((stop, i) => {
              const isInSegment = stop.seq >= fromSeq && stop.seq <= toSeq;
              const isFirst = i === 0;
              const isLast  = i === stops.length - 1;
              return (
                // Keyed on seq, not station_id: a circular route can call at
                // the same station twice.
                <div key={stop.seq} className={`rm-stop ${isInSegment ? "rm-stop--highlight" : ""}`}>
                  <div className="rm-stop-line">
                    <div className={`rm-dot ${isInSegment ? "rm-dot--blue" : ""}`} />
                    {!isLast && <div className={`rm-bar ${isInSegment && stop.seq < toSeq ? "rm-bar--blue" : ""}`} />}
                  </div>
                  <div className="rm-stop-info">
                    <div className="rm-stop-name">
                      {stop.station_name}
                      <span className="rm-stop-code"> ({stop.station_code})</span>
                    </div>
                    <div className="rm-stop-times">
                      {!isFirst && <span>Arr {formatTime(stop.arrival_time)}</span>}
                      {!isFirst && !isLast && <span className="rm-stop-sep">·</span>}
                      {!isLast && <span>Dep {formatTime(stop.departure_time)}</span>}
                    </div>
                    <div className="rm-stop-dist">{stop.distance_from_origin} km from origin</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
