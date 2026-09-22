import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadClassConfig } from "../utils/fareCalculator";
import { parseLocalDate, toDateString } from "../utils/dates";
import DatePicker from "./DatePicker";
import "./SearchBox.css";
import StationInput from "./StationInput";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ALL_OPTION = { coach_type: "ALL", label: "All Class" };

export default function SearchBox({ defaultValues }) {
  const navigate = useNavigate();
  const [from, setFrom] = useState(defaultValues?.from || null);
  const [to,   setTo]   = useState(defaultValues?.to   || null);
  const [date, setDate] = useState(defaultValues?.date || toDateString());
  const [cls,  setCls]  = useState(defaultValues?.cls  || "ALL");
  const [options, setOptions] = useState([ALL_OPTION]);
  const [showDatePicker, setShowDP] = useState(false);
  const [showClassMenu,  setShowCM] = useState(false);
  const [error, setError] = useState("");

  const dateCellRef  = useRef(null);
  const classCellRef = useRef(null);

  useEffect(() => {
    loadClassConfig()
      .then((config) => setOptions([ALL_OPTION, ...config.classes]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!showDatePicker && !showClassMenu) return;
    function handleClickOutside(e) {
      if (dateCellRef.current && !dateCellRef.current.contains(e.target)) setShowDP(false);
      if (classCellRef.current && !classCellRef.current.contains(e.target)) setShowCM(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDatePicker, showClassMenu]);

  const selected = parseLocalDate(date) || new Date();
  const fmt = {
    day: selected.getDate(),
    month: MONTHS[selected.getMonth()],
    year: String(selected.getFullYear()).slice(2),
    weekday: DAYS[selected.getDay()],
  };
  const clsLabel = options.find((o) => o.coach_type === cls)?.label || cls;

  function swap() {
    setFrom(to);
    setTo(from);
  }

  function handleSearch() {
    if (!from || !to) { setError("Please select both From and To stations."); return; }
    if (from.station_id === to.station_id) { setError("From and To cannot be the same station."); return; }
    setError("");

    const params = new URLSearchParams({
      fromId: from.station_id, toId: to.station_id, date, cls,
      fromName: from.station_name, fromCode: from.station_code,
      toName: to.station_name,     toCode: to.station_code,
    });
    navigate(`/search?${params.toString()}`);
  }

  return (
    <div className="sb-wrapper">
      <div className="sb-bar">
        <div className="sb-cell sb-cell--station">
          <div className="sb-cell-label">From</div>
          <StationInput value={from} onChange={setFrom} label="" />
          <button className="sb-swap" onClick={swap} aria-label="Swap stations">⇄</button>
        </div>

        <div className="sb-cell sb-cell--station">
          <div className="sb-cell-label">To</div>
          <StationInput value={to} onChange={setTo} label="" />
        </div>

        <div className="sb-cell sb-cell--date" ref={dateCellRef}
          onClick={() => { setShowDP((p) => !p); setShowCM(false); }}>
          <div className="sb-cell-label">Travel Date <span className="sb-chevron">⌄</span></div>
          <div className="sb-date-big">
            <span className="sb-date-day">{fmt.day}</span>
            <span className="sb-date-month">{fmt.month}'{fmt.year}</span>
          </div>
          <div className="sb-date-sub">{fmt.weekday}</div>
          {showDatePicker && (
            <div className="sb-popover sb-popover--calendar" onClick={(e) => e.stopPropagation()}>
              <DatePicker
                value={date}
                minDate={toDateString()}
                onSelect={setDate}
                onClose={() => setShowDP(false)}
              />
            </div>
          )}
        </div>

        <div className="sb-cell sb-cell--class" ref={classCellRef}
          onClick={() => { setShowCM((p) => !p); setShowDP(false); }}>
          <div className="sb-cell-label">Class <span className="sb-chevron">⌄</span></div>
          <div className="sb-class-big">{cls}</div>
          <div className="sb-date-sub">{clsLabel}</div>
          {showClassMenu && (
            <div className="sb-popover" onClick={(e) => e.stopPropagation()}>
              {options.map((o) => (
                <div key={o.coach_type}
                  className={`sb-class-opt ${cls === o.coach_type ? "sb-class-opt--active" : ""}`}
                  onClick={() => { setCls(o.coach_type); setShowCM(false); }}>
                  <span className="sb-class-opt-code">{o.coach_type}</span>
                  <span className="sb-class-opt-label">{o.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && <div className="sb-error">{error}</div>}

      <div className="sb-search-row">
        <button className="sb-search-btn" onClick={handleSearch}>SEARCH</button>
      </div>
    </div>
  );
}
