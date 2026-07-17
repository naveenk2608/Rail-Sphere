import { useEffect, useRef, useState } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { api } from "../utils/api";
import "./StationInput.css";

export default function StationInput({ label, value, onChange }) {
  const [query,   setQuery]   = useState(value?.station_name ? `${value.station_name} (${value.station_code})` : "");
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(query, 300);
  const ref = useRef(null);
  const requestIdRef = useRef(0);

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
        if (requestIdRef.current !== currentId) return; // stale response, ignore
        setResults(data);
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

  function select(station) {
    setQuery(`${station.station_name} (${station.station_code})`);
    onChange(station);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={ref} className="si-wrapper">
      <label className="si-label">{label}</label>
      <input
        className="si-input"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); onChange(null); }}
        placeholder="City or station code"
      />
      {loading && <div className="si-loading">Searching…</div>}
      {open && results.length > 0 && (
        <ul className="si-dropdown">
          {results.map((s) => (
            <li key={s.station_id} className="si-item" onMouseDown={() => select(s)}>
              <span className="si-code">{s.station_code}</span>
              <span className="si-name">{s.station_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}