import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import "./Modal.css";

let nextId = 0;

// Accessible dialog: moves focus in on open and back to the opener on close,
// closes on Escape or a click on the backdrop. Rendered into <body> so no
// ancestor's transform or stacking context can clip or cover it.
export default function Modal({ title, subtitle, onClose, children, footer, size = "md" }) {
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useRef(`modal-title-${++nextId}`).current;

  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    function onKey(e) { if (e.key === "Escape") onCloseRef.current(); }
    document.addEventListener("keydown", onKey);
    // The page behind shouldn't scroll while the dialog is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, []);

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={`modal modal--${size}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-head-text">
            <h2 className="modal-title" id={titleId}>{title}</h2>
            {subtitle && <div className="modal-sub">{subtitle}</div>}
          </div>
          <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
