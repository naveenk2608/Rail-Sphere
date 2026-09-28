import Icon from "./Icon";
import "./Stepper.css";

const STEPS = ["Train", "Seats", "Passengers", "Review", "Ticket"];

// Progress through the booking. `current` is the index of the active step.
export default function Stepper({ current }) {
  return (
    <ol className="stepper" aria-label="Booking progress">
      {STEPS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li key={label} className={`stepper-step stepper-step--${state}`}
            aria-current={state === "active" ? "step" : undefined}>
            <span className="stepper-dot" aria-hidden="true">
              {state === "done" ? <Icon name="check" size={12} strokeWidth={2.8} /> : i + 1}
            </span>
            <span className="stepper-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
