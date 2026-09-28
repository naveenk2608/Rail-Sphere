import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import JourneySegments from "./JourneySegments";
import Modal from "./Modal";

// The one place most travellers will ever see how availability is worked
// out: a small "info" link that opens a plain-language explanation.
export function AvailabilityExplainer() {
  return (
    <>
      <p className="avail-p">
        Seat availability is calculated for the journey you select, not for the
        train's whole route. When a passenger gets off partway, their seat can be
        booked by someone boarding from that station onwards.
      </p>
      <JourneySegments />
      <p className="avail-p avail-p--muted">
        So the number of seats you see is the number actually free between your
        two stations on your date.
      </p>
    </>
  );
}

export default function AvailabilityInfo({ label = "How availability works" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="avail-link" onClick={() => setOpen(true)}>
        <Icon name="info" size={15} /> {label}
      </button>
      {open && (
        <Modal title="How availability works" onClose={() => setOpen(false)}
          footer={<>
            <Link to="/how-it-works#availability" className="btn btn--secondary btn--sm" onClick={() => setOpen(false)}>Learn more</Link>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setOpen(false)}>Got it</button>
          </>}>
          <AvailabilityExplainer />
        </Modal>
      )}
    </>
  );
}
