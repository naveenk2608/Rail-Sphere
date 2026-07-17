import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DatePicker from "./DatePicker";
import "./SearchBox.css";
import StationInput from "./StationInput";

const CLASSES = ["ALL", "SL", "3A", "2A", "1A"];
const CLASS_LABELS = { ALL: "All Class", SL: "Sleeper", "3A": "3rd AC", "2A": "2nd AC", "1A": "1st AC" };
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function getLocalDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(d) {
  const dt = new Date(d);
  return { day: dt.getDate(), month: MONTHS[dt.getMonth()], year: String(dt.getFullYear()).slice(2), weekday: DAYS[dt.getDay()] };
}

export default function SearchBox({ defaultValues }) {
  const navigate = useNavigate();
  const [from, setFrom]             = useState(defaultValues?.from || null);
  const [to,   setTo]               = useState(defaultValues?.to   || null);
  const [date, setDate]             = useState(defaultValues?.date  || getLocalDateString());
  const [cls,  setCls]              = useState(defaultValues?.cls   || "ALL");
  const [showDatePicker, setShowDP] = useState(false);
  const [showClassMenu,  setShowCM] = useState(false);
  const [error, setError]           = useState("");

  const dateCellRef  = useRef(null);
  const classCellRef = useRef(null);

  useEffect(() => {
    if (!showDatePicker && !showClassMenu) return;
    function handleClickOutside(e) {
      if (dateCellRef.current && !dateCellRef.current.contains(e.target)) {
        setShowDP(false);
      }
      if (classCellRef.current && !classCellRef.current.contains(e.target)) {
        setShowCM(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDatePicker, showClassMenu]);

  const fmt = formatDate(date);

  function swap() { const t = from; setFrom(to); setTo(t); }

  function handleSearch() {
    if (!from || !to) { setError("Please select both From and To stations."); return; }
    if (from.station_id === to.station_id) { setError("From and To cannot be the same station."); return; }
    setError("");
    navigate(`/search?fromId=${from.station_id}&toId=${to.station_id}&date=${date}&cls=${cls}&fromName=${encodeURIComponent(from.station_name)}&fromCode=${from.station_code}&toName=${encodeURIComponent(to.station_name)}&toCode=${to.station_code}`);
  }

  return (
    <div className="sb-wrapper">
      <div className="sb-bar">
        <div className="sb-cell sb-cell--station">
          <div className="sb-cell-label">From</div>
          <StationInput value={from} onChange={setFrom} label="" />
          <button className="sb-swap" onClick={swap} aria-label="Swap">⇄</button>
        </div>
        <div className="sb-cell sb-cell--station">
          <div className="sb-cell-label">To</div>
          <StationInput value={to} onChange={setTo} label="" />
        </div>
        <div className="sb-cell sb-cell--date" ref={dateCellRef} onClick={() => { setShowDP((p) => !p); setShowCM(false); }}>
          <div className="sb-cell-label">Travel Date <span className="sb-chevron">⌄</span></div>
          <div className="sb-date-big"><span className="sb-date-day">{fmt.day}</span><span className="sb-date-month">{fmt.month}'{fmt.year}</span></div>
          <div className="sb-date-sub">{fmt.weekday}</div>
          {showDatePicker && (
            <div className="sb-popover sb-popover--calendar" onClick={(e) => e.stopPropagation()}>
              <DatePicker
                value={date}
                minDate={getLocalDateString()}
                onSelect={setDate}
                onClose={() => setShowDP(false)}
              />
            </div>
          )}
        </div>
        <div className="sb-cell sb-cell--class" ref={classCellRef} onClick={() => { setShowCM((p) => !p); setShowDP(false); }}>
          <div className="sb-cell-label">Class <span className="sb-chevron">⌄</span></div>
          <div className="sb-class-big">{cls}</div>
          <div className="sb-date-sub">{CLASS_LABELS[cls]}</div>
          {showClassMenu && (
            <div className="sb-popover" onClick={(e) => e.stopPropagation()}>
              {CLASSES.map((c) => (
                <div key={c} className={`sb-class-opt ${cls === c ? "sb-class-opt--active" : ""}`}
                  onClick={() => { setCls(c); setShowCM(false); }}>
                  <span className="sb-class-opt-code">{c}</span>
                  <span className="sb-class-opt-label">{CLASS_LABELS[c]}</span>
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