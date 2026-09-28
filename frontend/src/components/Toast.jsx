import { useEffect, useRef } from "react";
import Icon from "./Icon";
import "./Toast.css";

export default function Toast({ message, type = "success", onClose }) {
  // Callers pass an inline arrow, so depending on `onClose` would restart the
  // timer on every parent render and the toast would never dismiss itself.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`toast toast--${type}`} role="status" aria-live="polite">
      <span className="toast-icon">
        <Icon name={type === "success" ? "check" : type === "error" ? "alert" : "info"} size={17} strokeWidth={2.2} />
      </span>
      <span className="toast-msg">{message}</span>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Dismiss">
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}
