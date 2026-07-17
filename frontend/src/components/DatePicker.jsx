import { useState } from "react";
import "./DatePicker.css";

const DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function toLocalDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function DatePicker({ value, onSelect, minDate, onClose }) {
  const selectedDate = new Date(value + "T00:00:00");
  const [viewYear, setViewYear]   = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const min = minDate ? new Date(minDate + "T00:00:00") : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const firstOfMonth    = new Date(viewYear, viewMonth, 1);
  const startWeekday    = firstOfMonth.getDay();
  const daysInMonth     = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const cells = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, current: false, date: new Date(viewYear, viewMonth - 1, daysInPrevMonth - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, date: new Date(viewYear, viewMonth, d) });
  }
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({ day: nextDay, current: false, date: new Date(viewYear, viewMonth + 1, nextDay) });
    nextDay++;
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function isDisabled(d) {
    return min ? d < min : false;
  }

  function changeMonth(delta) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  function pickDay(cell) {
    if (isDisabled(cell.date)) return;
    onSelect(toLocalDateString(cell.date));
    onClose();
  }

  const selLabel = `${selectedDate.getDate()} ${MONTHS_SHORT[selectedDate.getMonth()]} ${String(selectedDate.getFullYear()).slice(2)}`;

  return (
    <div className="dp-wrapper">
      <div className="dp-selected-row">
        <span className="dp-cal-icon">📅</span>
        <span className="dp-selected-label">{selLabel}</span>
      </div>

      <div className="dp-header">
        <span className="dp-month-label">{MONTHS[viewMonth]} {viewYear}</span>
        <div className="dp-nav">
          <button className="dp-nav-btn" onClick={() => changeMonth(-1)} aria-label="Previous month">‹</button>
          <button className="dp-nav-btn" onClick={() => changeMonth(1)} aria-label="Next month">›</button>
        </div>
      </div>
      <div className="dp-weekdays">
        {DAYS.map((d) => <span key={d} className="dp-weekday">{d}</span>)}
      </div>
      <div className="dp-grid">
        {cells.map((cell, i) => {
          const disabled = isDisabled(cell.date);
          const selected = isSameDay(cell.date, selectedDate);
          const isToday  = isSameDay(cell.date, today);
          return (
            <button
              key={i}
              className={`dp-day ${!cell.current ? "dp-day--muted" : ""} ${selected ? "dp-day--selected" : ""} ${isToday && !selected ? "dp-day--today" : ""}`}
              disabled={disabled}
              onClick={() => pickDay(cell)}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      <div className="dp-footer">
        <button className="dp-footer-btn" onClick={() => { onSelect(toLocalDateString(today)); onClose(); }}>
          Today
        </button>
      </div>
    </div>
  );
}