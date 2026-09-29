const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  canBook,
  validateSchedule,
  parseTicketQR,
} = require("../src/utils/domain");
const valid = () => ({
  origin: "Davao Ecoland Terminal",
  destination: "Tagum Terminal",
  plateNumber: "ABC 123",
  totalSeats: 20,
  fare: 150,
  departureTime: new Date(Date.now() + 86400000),
  status: "scheduled",
  seats: {},
});
test("booking closes at exactly ten minutes before departure", () => {
  const s = valid();
  const now = Date.now();
  s.departureTime = new Date(now + 600000);
  assert.equal(canBook(s, now), false);
  s.departureTime = new Date(now + 600001);
  assert.equal(canBook(s, now), true);
});
test("full and cancelled trips cannot be booked", () => {
  assert.equal(
    canBook({ ...valid(), totalSeats: 1, seats: { 1: "ticket" } }),
    false,
  );
  assert.equal(canBook({ ...valid(), status: "cancelled" }), false);
});
test("terminal, capacity, fare and departure validation", () => {
  assert.doesNotThrow(() => validateSchedule(valid()));
  for (const patch of [
    { origin: "" },
    { destination: "davao ecoland terminal" },
    { totalSeats: 61 },
    { totalSeats: 2.5 },
    { fare: NaN },
    { fare: 0 },
    { departureTime: new Date(0) },
  ])
    assert.throws(() => validateSchedule({ ...valid(), ...patch }));
});
test("QR accepts only application ticket references, no paths or payment codes", () => {
  const id = "Abcdefghij1234567890";
  assert.equal(
    parseTicketQR(JSON.stringify({ app: "scanandgo", v: 1, ticketId: id })),
    id,
  );
  for (const value of [
    "text",
    "{}",
    JSON.stringify({ app: "scanandgo", v: 1, ticketId: "../users/admin" }),
    JSON.stringify({ app: "scanandgo-demo-payment", ticketId: id }),
  ])
    assert.throws(() => parseTicketQR(value));
});
