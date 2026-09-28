import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadClassConfig } from "../utils/fareCalculator";
import { parseLocalDate, toDateString } from "../utils/dates";
import DatePicker from "./DatePicker";
import Icon from "./Icon";
import "./SearchBox.css";
import StationInput from "./StationInput";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ALL_OPTION = { coach_type: "ALL", label: "All classes" };

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

  // The date and class cells open popovers; Enter or Space opens them from
  // the keyboard. Keys pressed inside the popover itself are ignored here.
  function onCellKey(e, toggle) {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    if (e.key === "Escape") { setShowDP(false); setShowCM(false); }
  }

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
          <StationInput value={from} onChange={setFrom} ariaLabel="From station" />
          <button type="button" className="sb-swap" onClick={swap} aria-label="Swap From and To stations"><Icon name="swap" size={16} /></button>
        </div>

        <div className="sb-cell sb-cell--station">
          <div className="sb-cell-label">To</div>
          <StationInput value={to} onChange={setTo} ariaLabel="To station" />
        </div>

        <div className="sb-cell sb-cell--date" ref={dateCellRef}
          role="button" tabIndex={0} aria-haspopup="dialog" aria-expanded={showDatePicker}
          aria-label={`Travel date: ${fmt.weekday} ${fmt.day} ${fmt.month} 20${fmt.year}. Change date`}
          onKeyDown={(e) => onCellKey(e, () => { setShowDP((p) => !p); setShowCM(false); })}
          onClick={() => { setShowDP((p) => !p); setShowCM(false); }}>
          <div className="sb-cell-label">Date</div>
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
          role="button" tabIndex={0} aria-haspopup="listbox" aria-expanded={showClassMenu}
          aria-label={`Class: ${clsLabel}. Change class`}
          onKeyDown={(e) => onCellKey(e, () => { setShowCM((p) => !p); setShowDP(false); })}
          onClick={() => { setShowCM((p) => !p); setShowDP(false); }}>
          <div className="sb-cell-label">Class</div>
          <div className="sb-class-big">{cls}</div>
          <div className="sb-date-sub">{clsLabel}</div>
          {showClassMenu && (
            <div className="sb-popover" role="listbox" aria-label="Class" onClick={(e) => e.stopPropagation()}>
              {options.map((o) => (
                <button type="button" key={o.coach_type} role="option" aria-selected={cls === o.coach_type}
                  className={`sb-class-opt ${cls === o.coach_type ? "sb-class-opt--active" : ""}`}
                  onClick={() => { setCls(o.coach_type); setShowCM(false); classCellRef.current?.focus(); }}>
                  <span className="sb-class-opt-code mono">{o.coach_type}</span>
                  <span className="sb-class-opt-label">{o.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="sb-search-row">
        {error ? <div className="sb-error" role="alert">{error}</div>
          : <div className="sb-note">Live seat availability and fares for every class.</div>}
        <button type="button" className="btn btn--primary btn--lg sb-search-btn" onClick={handleSearch}>
          <Icon name="search" /> Search trains
        </button>
      </div>
    </div>
  );
}
