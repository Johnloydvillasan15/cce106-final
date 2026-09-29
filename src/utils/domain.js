// Shared pure JavaScript validation; also covered by Node's built-in tests.
function milliseconds(value) {
  return value?.toMillis ? value.toMillis() : new Date(value).getTime();
}
function canBook(schedule, now = Date.now()) {
  return (
    schedule.status === "scheduled" &&
    milliseconds(schedule.departureTime) > now + 600000 &&
    Object.keys(schedule.seats || {}).length < schedule.totalSeats
  );
}
function validateSchedule(s) {
  if (
    !s.origin?.trim() ||
    !s.destination?.trim() ||
    s.origin.trim().toLowerCase() === s.destination.trim().toLowerCase()
  )
    throw Error("Choose different start and end terminals.");
  if (!s.plateNumber?.trim()) throw Error("Enter the bus plate number.");
  if (!Number.isInteger(s.totalSeats) || s.totalSeats < 1 || s.totalSeats > 60)
    throw Error("Enter 1–60 seats.");
  if (!Number.isFinite(s.fare) || s.fare <= 0 || s.fare > 10000)
    throw Error("Enter a fare between ₱0.01 and ₱10,000.");
  if (
    !Number.isFinite(milliseconds(s.departureTime)) ||
    milliseconds(s.departureTime) <= Date.now() + 600000
  )
    throw Error("Departure must be more than 10 minutes from now.");
}
function parseTicketQR(value) {
  let data;
  try {
    data = JSON.parse(value);
  } catch {
    throw Error("This is not a Scan&Go ticket QR code.");
  }
  if (
    data.app !== "scanandgo" ||
    data.v !== 1 ||
    typeof data.ticketId !== "string" ||
    !/^[a-zA-Z0-9]{20}$/.test(data.ticketId)
  )
    throw Error("Invalid Scan&Go ticket QR code.");
  return data.ticketId;
}
module.exports = { milliseconds, canBook, validateSchedule, parseTicketQR };
