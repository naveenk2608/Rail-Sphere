import { useEffect, useRef, useState } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { api } from "../utils/api";
import "./StationInput.css";

function displayText(station) {
  return station ? `${station.station_name} (${station.station_code})` : "";
}

let nextId = 0;

export default function StationInput({ label, ariaLabel, value, onChange }) {
  const [query,   setQuery]   = useState(displayText(value));
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(query, 300);
  const ref = useRef(null);
  const requestIdRef = useRef(0);
  const typingRef = useRef(false);
  const [active, setActive] = useState(-1);
  const [listId] = useState(() => `station-list-${++nextId}`);

  // Mirror changes the parent makes (e.g. the swap button). Skipped while the
  // user is typing, otherwise their own keystrokes would be overwritten.
  useEffect(() => {
    if (typingRef.current) {
      typingRef.current = false;
      return;
    }
    setQuery(displayText(value));
  }, [value]);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const currentId = ++requestIdRef.current;
    setLoading(true);

    api.searchStations(debounced)
      .then((data) => {
        if (requestIdRef.current !== currentId) return;
        setResults(data);
        setActive(data.length ? 0 : -1);
        setOpen(true);
      })
      .catch(() => {})
      .finally(() => {
        if (requestIdRef.current === currentId) setLoading(false);
      });
  }, [debounced]);

  useEffect(() => {
    function handleOut(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOut);
    return () => document.removeEventListener("mousedown", handleOut);
  }, []);

  function handleType(e) {
    setQuery(e.target.value);
    setOpen(true);
    // Flag only when value actually changes, otherwise the flag would linger
    // and swallow the next parent-driven change (e.g. a swap).
    if (value) {
      typingRef.current = true;
      onChange(null);
    }
  }

  function select(station) {
    setQuery(displayText(station));
    onChange(station);
    setOpen(false);
    setResults([]);
    setActive(-1);
  }

  function onKeyDown(e) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % results.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + results.length) % results.length); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); select(results[active]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  const expanded = open && results.length > 0;

  return (
    <div ref={ref} className="si-wrapper">
      {label && <label className="si-label">{label}</label>}
      <input
        className="si-input"
        value={query}
        onChange={handleType}
        onKeyDown={onKeyDown}
        placeholder="City or station code"
        aria-label={ariaLabel || label || "Station"}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      {loading && <div className="si-loading">Searching…</div>}
      {expanded && (
        <ul className="si-dropdown" id={listId} role="listbox">
          {results.map((s, i) => (
            <li key={s.station_id} id={`${listId}-${i}`} role="option" aria-selected={i === active}
              className={`si-item ${i === active ? "si-item--active" : ""}`}
              onMouseEnter={() => setActive(i)} onMouseDown={() => select(s)}>
              <span className="si-code mono">{s.station_code}</span>
              <span className="si-name">{s.station_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
