import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import Stepper from "../components/Stepper";
import Toast from "../components/Toast";
import { useClassConfig } from "../hooks/useClassConfig";
import { api } from "../utils/api";
import { calculateFare, classDisplay, formatFare } from "../utils/fareCalculator";
import { dayShift, formatDate, stopDate } from "../utils/dates";
import "./PassengerDetails.css";

const GENDER_OPTIONS = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
  { value: "OTHER", label: "Other" },
];

function emptyPax() {
  return { passenger_name: "", age: "", gender: "M" };
}

// URLSearchParams already decodes; decoding again would corrupt any literal %.
function parseSeats(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function PassengerDetails() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [seats] = useState(() => parseSeats(params.get("seats")));
  const trainId     = params.get("trainId");
  const trainName   = params.get("trainName");
  const trainNumber = params.get("trainNumber");
  const coachType   = params.get("coachType");
  const date        = params.get("date");        // run date at the train's origin
  const depOffset   = Number(params.get("depOffset")) || 0;
  const arrOffset   = Number(params.get("arrOffset")) || 0;
  const fromId      = params.get("fromId");
  const toId        = params.get("toId");
  const distance    = Number(params.get("distance"));
  const fromCode    = params.get("fromCode");
  const toCode      = params.get("toCode");
  const dep         = params.get("dep");
  const arr         = params.get("arr");

  const [passengers, setPassengers] = useState(() => seats.map(() => emptyPax()));
  const [savedList,  setSavedList]  = useState([]);
  const [errors,     setErrors]     = useState(() => seats.map(() => ({})));
  const [toast,      setToast]      = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // "details" to fill in passengers, then "review" before confirming.
  const [phase,      setPhase]      = useState("details");

  useEffect(() => {
    if (seats.length === 0) navigate("/", { replace: true });
  }, [seats.length, navigate]);

  const config = useClassConfig();

  useEffect(() => {
    api.getSavedPassengers().then(setSavedList).catch(() => {});
  }, []);

  function fillFromSaved(idx, saved) {
    const updated = [...passengers];
    updated[idx] = {
      passenger_name: saved.passenger_name,
      age: String(saved.age),
      gender: saved.gender || "M",
    };
    setPassengers(updated);
  }

  function updateField(idx, field, value) {
    const updated = [...passengers];
    updated[idx] = { ...updated[idx], [field]: value };
    setPassengers(updated);

    const errs = [...errors];
    errs[idx] = { ...errs[idx], [field]: "" };
    setErrors(errs);
  }

  function validate() {
    const errs = passengers.map((p) => {
      const e = {};
      if (!p.passenger_name.trim()) e.passenger_name = "Name required";
      const age = Number(p.age);
      if (!p.age || !Number.isInteger(age) || age < 1 || age > 120)
        e.age = "Whole number, 1–120";
      if (!p.gender) e.gender = "Gender required";
      return e;
    });
    setErrors(errs);
    return errs.every((e) => Object.keys(e).length === 0);
  }

  function goToReview() {
    if (!validate()) return;
    setPhase("review");
    window.scrollTo(0, 0);
  }

  async function handleSubmit() {
    if (!validate()) { setPhase("details"); return; }
    setSubmitting(true);
    try {
      const res = await api.createBooking({
        train_id:               Number(trainId),
        journey_date:           date,
        source_station_id:      Number(fromId),
        destination_station_id: Number(toId),
        coach_type:             coachType,
        seats,
        passengers: passengers.map((p) => ({
          passenger_name: p.passenger_name.trim(),
          age: Number(p.age),
          gender: p.gender,
        })),
      });
      // The ticket page shows its confirmation view for a booking just made.
      navigate(`/ticket/${res.booking_id}`, { replace: true, state: { booked: true } });
    } catch (err) {
      setToast({ message: err.message, type: "error" });
      setSubmitting(false);
    }
  }

  if (seats.length === 0) return null;

  const fare = calculateFare(config, distance, coachType, seats.length);
  const boardingDate = formatDate(stopDate(date, depOffset));
  const shift = dayShift(depOffset, arrOffset);

  return (
    <div className="pd-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="page-head">
        <div className="page-head-inner">
          <button type="button" className="page-back"
            onClick={() => (phase === "review" ? setPhase("details") : navigate(-1))}
            aria-label={phase === "review" ? "Back to passenger details" : "Back to seats"}>
            <Icon name="arrow" size={17} className="flip" />
          </button>
          <div>
            <h1 className="page-title">{phase === "review" ? "Review your journey" : "Passenger details"}</h1>
            <p className="page-sub">{trainName} · {fromCode} → {toCode} · {boardingDate}</p>
          </div>
          <Stepper current={phase === "review" ? 3 : 2} />
        </div>
      </header>

      <div className="page-body pd-body">
        <div className="pd-left">
          {phase === "review" && (
            <section className="pd-review" aria-label="Journey and passengers">
              <div className="pd-review-journey">
                <div>
                  <div className="pd-review-code mono">{fromCode}</div>
                  <div className="pd-review-time mono">{dep}</div>
                </div>
                <div className="pd-review-mid">
                  <span className="pd-review-line" aria-hidden="true" />
                  <span>{trainNumber} · {trainName}</span>
                  <span className="pd-review-date">{boardingDate}</span>
                </div>
                <div className="pd-review-right">
                  <div className="pd-review-code mono">{toCode}</div>
                  <div className="pd-review-time mono">{arr}{shift && <span className="day-shift">{shift}</span>}</div>
                </div>
              </div>
              <div className="table-scroll">
                <table className="pd-review-table">
                  <thead><tr><th scope="col">Passenger</th><th scope="col">Age</th><th scope="col">Gender</th><th scope="col">Coach</th><th scope="col">Seat</th></tr></thead>
                  <tbody>
                    {passengers.map((p, i) => (
                      <tr key={i}>
                        <td>{p.passenger_name.trim()}</td>
                        <td>{p.age}</td>
                        <td>{GENDER_OPTIONS.find((g) => g.value === p.gender)?.label}</td>
                        <td className="mono">{seats[i].coach_number}</td>
                        <td className="mono">{seats[i].seat_no}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="btn btn--secondary btn--sm pd-edit" onClick={() => setPhase("details")}>
                Edit passengers
              </button>
            </section>
          )}

          {phase === "details" && passengers.map((pax, idx) => (
            <div key={idx} className="pd-pax-card">
              <div className="pd-pax-header">
                <div className="pd-pax-title">Passenger {idx + 1}</div>
                <span className="pd-seat-badge">
                  {seats[idx].coach_number} · {seats[idx].seat_no}
                </span>
              </div>

              {savedList.length > 0 && (
                <div className="pd-saved-row">
                  <div className="pd-saved-label">Quick fill:</div>
                  <div className="pd-saved-chips">
                    {savedList.map((s) => (
                      <button key={s.id} type="button" className="pd-saved-chip"
                        onClick={() => fillFromSaved(idx, s)}>
                        {s.passenger_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pd-fields">
                <div className="pd-field pd-field--name">
                  <label className="pd-label" htmlFor={`pax-${idx}-name`}>Full name</label>
                  <input id={`pax-${idx}-name`} autoComplete="name" aria-invalid={Boolean(errors[idx]?.passenger_name)}
                    className={`pd-input ${errors[idx]?.passenger_name ? "pd-input--err" : ""}`}
                    placeholder="Name as on ID" value={pax.passenger_name}
                    onChange={(e) => updateField(idx, "passenger_name", e.target.value)} />
                  {errors[idx]?.passenger_name && <span className="pd-err">{errors[idx].passenger_name}</span>}
                </div>

                <div className="pd-field pd-field--age">
                  <label className="pd-label" htmlFor={`pax-${idx}-age`}>Age</label>
                  <input id={`pax-${idx}-age`} aria-invalid={Boolean(errors[idx]?.age)}
                    className={`pd-input ${errors[idx]?.age ? "pd-input--err" : ""}`}
                    type="number" inputMode="numeric" min="1" max="120"
                    placeholder="Age" value={pax.age}
                    onChange={(e) => updateField(idx, "age", e.target.value)} />
                  {errors[idx]?.age && <span className="pd-err">{errors[idx].age}</span>}
                </div>

                <div className="pd-field pd-field--gender">
                  <label className="pd-label" htmlFor={`pax-${idx}-gender`}>Gender</label>
                  <select id={`pax-${idx}-gender`} className="pd-input" value={pax.gender}
                    onChange={(e) => updateField(idx, "gender", e.target.value)}>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pd-right">
          <div className="pd-fare-card">
            <div className="pd-fare-title">Fare summary</div>
            <div className="pd-fare-row">
              <span>Base fare ({seats.length} pax)</span><span>{formatFare(fare.base)}</span>
            </div>
            <div className="pd-fare-row">
              <span>Reservation charge</span><span>{formatFare(fare.reservation)}</span>
            </div>
            <div className="pd-fare-row"><span>GST</span><span>{formatFare(fare.gst)}</span></div>
            <div className="pd-fare-divider" />
            <div className="pd-fare-total"><span>Total</span><span>{formatFare(fare.total)}</span></div>
          </div>

          <div className="pd-journey-card">
            <div className="pd-journey-title">Journey details</div>
            <div className="pd-journey-row"><span>Train</span><span>{trainNumber}</span></div>
            <div className="pd-journey-row"><span>Class</span><span>{classDisplay(config, coachType)}</span></div>
            <div className="pd-journey-row"><span>Date</span><span>{boardingDate}</span></div>
            <div className="pd-journey-row"><span>Dep</span><span>{dep}</span></div>
            <div className="pd-journey-row">
              <span>Arr</span>
              <span>{arr}{shift && <span className="day-shift">{shift}</span>}</span>
            </div>
          </div>

          {phase === "details" ? (
            <button type="button" className="btn btn--primary btn--lg pd-confirm-btn" onClick={goToReview}>
              Continue to review <Icon name="arrow" />
            </button>
          ) : (
            <button type="button" className="btn btn--primary btn--lg pd-confirm-btn" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Booking…" : <>Confirm booking <Icon name="lock" /></>}
            </button>
          )}
          <p className="pd-secure">
            {phase === "details"
              ? "You can check everything before you book."
              : "If a seat is taken before you confirm, we'll ask you to pick another."}
          </p>
        </div>
      </div>
    </div>
  );
}
