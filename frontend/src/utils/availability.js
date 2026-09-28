// How a class's seat count is described to travellers, everywhere it shows.
export const FEW_SEATS = 20;

export function availability(seats, departed = false) {
  if (departed) return { text: "Departed", short: "Departed", tone: "off", bookable: false };
  if (seats <= 0) return { text: "Not available", short: "Not available", tone: "off", bookable: false };
  if (seats <= FEW_SEATS) return { text: `Only ${seats} left`, short: `${seats} left`, tone: "low", bookable: true };
  return { text: `Available · ${seats}`, short: `${seats} seats`, tone: "ok", bookable: true };
}
