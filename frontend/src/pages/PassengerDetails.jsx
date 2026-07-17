import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Toast from "../components/Toast";
import { api } from "../utils/api";
import { calculateFare, formatFare } from "../utils/fareCalculator";
import "./PassengerDetails.css";

const GENDER_OPTIONS = [{ value: "M", label: "Male" }, { value: "F", label: "Female" }, { value: "OTHER", label: "Other" }];

function emptyPax() { return { passenger_name: "", age: "", gender: "M" }; }

export default function PassengerDetails() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();

  const seats      = JSON.parse(decodeURIComponent(params.get("seats") || "[]"));
  const trainId    = params.get("trainId");
  const trainName  = params.get("trainName");
  const trainNumber= params.get("trainNumber");
  const coachType  = params.get("coachType");
  const date       = params.get("date");
  const fromId     = params.get("fromId");
  const toId       = params.get("toId");
  const fromSeq    = Number(params.get("fromSeq"));
  const toSeq      = Number(params.get("toSeq"));
  const distance   = Number(params.get("distance"));
  const fromCode   = params.get("fromCode");
  const toCode     = params.get("toCode");
  const dep        = params.get("dep");
  const arr        = params.get("arr");

  const [passengers,    setPassengers]    = useState(seats.map(() => emptyPax()));
  const [savedList,     setSavedList]     = useState([]);
  const [errors,        setErrors]        = useState(seats.map(() => ({})));
  const [toast,         setToast]         = useState(null);
  const [submitting,    setSubmitting]    = useState(false);

  useEffect(() => {
    api.getSavedPassengers()
      .then(setSavedList)
      .catch(() => {});
  }, []);

  function fillFromSaved(idx, saved) {
    const updated = [...passengers];
    updated[idx] = { passenger_name: saved.passenger_name, age: String(saved.age), gender: saved.gender || "M" };
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
      if (!p.age || isNaN(p.age) || Number(p.age) < 1 || Number(p.age) > 120) e.age = "Valid age required";
      if (!p.gender) e.gender = "Gender required";
      return e;
    });
    setErrors(errs);
    return errs.every((e) => Object.keys(e).length === 0);
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const body = {
        train_id:               Number(trainId),
        journey_date:           date,
        source_station_id:      Number(fromId),
        destination_station_id: Number(toId),
        from_seq:               fromSeq,
        to_seq:                 toSeq,
        distance,
        coach_type:             coachType,
        seats,
        passengers: passengers.map((p, i) => ({
          ...p,
          age:      Number(p.age),
          coach_id: seats[i].coach_id,
          seat_no:  seats[i].seat_no,
        })),
      };
      const res = await api.createBooking(body);
      setToast({ message: "Booking confirmed!", type: "success" });
      setTimeout(() => navigate(`/ticket/${res.booking_id}`), 800);
    } catch (err) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  const fare = calculateFare(distance, coachType, seats.length);

  return (
    <div className="pd-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="pd-topbar">
        <button className="pd-back" onClick={() => navigate(-1)}>← Back</button>
        <div>
          <div className="pd-title">Passenger details</div>
          <div className="pd-sub">{trainName} · {fromCode} → {toCode} · {date}</div>
        </div>
      </div>

      {/* Stepper */}
      <div className="pd-stepper">
        <div className="pd-step pd-step--done">✓ Search</div>
        <div className="pd-step-line" />
        <div className="pd-step pd-step--done">✓ Seats</div>
        <div className="pd-step-line" />
        <div className="pd-step pd-step--active">Passengers</div>
        <div className="pd-step-line" />
        <div className="pd-step">Confirm</div>
      </div>

      <div className="pd-body">
        <div className="pd-left">
          {passengers.map((pax, idx) => (
            <div key={idx} className="pd-pax-card">
              <div className="pd-pax-header">
                <div className="pd-pax-title">Passenger {idx + 1}</div>
                <span className="pd-seat-badge">{seats[idx].coach_number} · {seats[idx].seat_no}</span>
              </div>

              {/* Saved passengers */}
              {savedList.length > 0 && (
                <div className="pd-saved-row">
                  <div className="pd-saved-label">Quick fill:</div>
                  <div className="pd-saved-chips">
                    {savedList.map((s) => (
                      <button key={s.saved_passenger_id} className="pd-saved-chip"
                        onClick={() => fillFromSaved(idx, s)}>
                        {s.passenger_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pd-fields">
                <div className="pd-field pd-field--name">
                  <label className="pd-label">Full name *</label>
                  <input className={`pd-input ${errors[idx]?.passenger_name ? "pd-input--err" : ""}`}
                    placeholder="Name as on ID" value={pax.passenger_name}
                    onChange={(e) => updateField(idx, "passenger_name", e.target.value)} />
                  {errors[idx]?.passenger_name && <span className="pd-err">{errors[idx].passenger_name}</span>}
                </div>
                <div className="pd-field pd-field--age">
                  <label className="pd-label">Age *</label>
                  <input className={`pd-input ${errors[idx]?.age ? "pd-input--err" : ""}`}
                    type="number" placeholder="Age" value={pax.age}
                    onChange={(e) => updateField(idx, "age", e.target.value)} />
                  {errors[idx]?.age && <span className="pd-err">{errors[idx].age}</span>}
                </div>
                <div className="pd-field pd-field--gender">
                  <label className="pd-label">Gender *</label>
                  <select className="pd-input" value={pax.gender}
                    onChange={(e) => updateField(idx, "gender", e.target.value)}>
                    {GENDER_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Fare summary */}
        <div className="pd-right">
          <div className="pd-fare-card">
            <div className="pd-fare-title">Fare summary</div>
            <div className="pd-fare-row"><span>Base fare ({seats.length} pax)</span><span>{formatFare(fare.base)}</span></div>
            <div className="pd-fare-row"><span>Reservation charge</span><span>{formatFare(fare.resCharge)}</span></div>
            <div className="pd-fare-row"><span>GST (5%)</span><span>{formatFare(fare.gst)}</span></div>
            <div className="pd-fare-divider" />
            <div className="pd-fare-total"><span>Total</span><span>{formatFare(fare.total)}</span></div>
          </div>

          <div className="pd-journey-card">
            <div className="pd-journey-title">Journey details</div>
            <div className="pd-journey-row"><span>Train</span><span>{trainNumber}</span></div>
            <div className="pd-journey-row"><span>Class</span><span>{coachType}</span></div>
            <div className="pd-journey-row"><span>Date</span><span>{date}</span></div>
            <div className="pd-journey-row"><span>Dep</span><span>{dep}</span></div>
            <div className="pd-journey-row"><span>Arr</span><span>{arr}</span></div>
          </div>

          <button className="pd-confirm-btn" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Confirming…" : "Confirm booking →"}
          </button>
        </div>
      </div>
    </div>
  );
}