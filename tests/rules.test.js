const { test, before, after, beforeEach } = require("node:test");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require("@firebase/rules-unit-testing");
const {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  Timestamp,
  serverTimestamp,
  writeBatch,
} = require("firebase/firestore");
let env;
const projectId = "demo-scanandgo";
const trip = () => ({
  origin: "Davao Terminal",
  destination: "Tagum Terminal",
  plateNumber: "ABC123",
  departureTime: Timestamp.fromMillis(Date.now() + 86400000),
  totalSeats: 20,
  fare: 150,
  isAircon: true,
  seats: {},
  lastTicketId: "",
  status: "scheduled",
  createdAt: Timestamp.now(),
});
before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: fs.readFileSync("firestore.rules", "utf8") },
  });
});
after(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "schedules", "trip"), trip());
    await setDoc(doc(db, "users", "admin"), { role: "admin" });
  });
});
const user = (uid) =>
  env.authenticatedContext(uid, { email: `${uid}@example.com` }).firestore();
async function reserve(db, uid, id, seat = 1, patch = {}) {
  return runTransaction(db, async (tx) => {
    const ref = doc(db, "schedules", "trip");
    const snap = await tx.get(ref);
    const s = snap.data();
    if (s.seats[String(seat)]) throw Error("Seat taken");
    const t = {
      userId: uid,
      email: `${uid}@example.com`,
      scheduleId: "trip",
      seatNumber: seat,
      origin: s.origin,
      destination: s.destination,
      departureTime: s.departureTime,
      plateNumber: s.plateNumber,
      isAircon: s.isAircon,
      fare: s.fare,
      paymentStatus: "demo_paid",
      status: "booked",
      createdAt: serverTimestamp(),
      ...patch,
    };
    tx.set(doc(db, "tickets", id), t);
    tx.update(ref, {
      seats: { ...s.seats, [String(seat)]: id },
      lastTicketId: id,
    });
  });
}
test("anonymous access and self promotion denied", async () => {
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), "schedules", "trip")),
  );
  await assertFails(
    setDoc(doc(user("u"), "users", "u"), {
      email: "u@example.com",
      role: "admin",
      createdAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(doc(user("u"), "users", "u"), {
      email: "u@example.com",
      role: "user",
      createdAt: serverTimestamp(),
    }),
  );
  await assertFails(updateDoc(doc(user("u"), "users", "u"), { role: "admin" }));
});
test("atomic seat reservation succeeds; duplicate and forged fare fail", async () => {
  await assertSucceeds(reserve(user("u"), "u", "ticketA"));
  await assert.rejects(reserve(user("v"), "v", "ticketB"), /Seat taken/);
  await assertFails(reserve(user("v"), "v", "ticketC", 2, { fare: 1 }));
});
test("seat and ticket cannot be written independently", async () => {
  await assertFails(
    updateDoc(doc(user("u"), "schedules", "trip"), {
      seats: { 1: "fake" },
      lastTicketId: "fake",
    }),
  );
  const s = trip();
  await assertFails(
    setDoc(doc(user("u"), "tickets", "alone"), {
      userId: "u",
      email: "u@example.com",
      scheduleId: "trip",
      seatNumber: 1,
      origin: s.origin,
      destination: s.destination,
      departureTime: s.departureTime,
      plateNumber: s.plateNumber,
      isAircon: s.isAircon,
      fare: s.fare,
      paymentStatus: "demo_paid",
      status: "booked",
      createdAt: serverTimestamp(),
    }),
  );
});
test("concurrent users cannot obtain the same seat", async () => {
  const outcomes = await Promise.allSettled([
    reserve(user("u"), "u", "raceA"),
    reserve(user("v"), "v", "raceB"),
  ]);
  if (outcomes.filter((x) => x.status === "fulfilled").length !== 1)
    throw Error("Expected exactly one winning reservation");
});
test("users see only their own bookings; administrators see all", async () => {
  await reserve(user("u"), "u", "ticketA");
  await assertFails(getDoc(doc(user("v"), "tickets", "ticketA")));
  await assertSucceeds(
    getDocs(
      query(collection(user("u"), "tickets"), where("userId", "==", "u")),
    ),
  );
  await assertFails(getDocs(collection(user("u"), "tickets")));
  await assertSucceeds(getDocs(collection(user("admin"), "tickets")));
});
test("admin cannot change sold trip details; check-in cannot be replayed", async () => {
  await reserve(user("u"), "u", "ticketA");
  await assertFails(
    updateDoc(doc(user("admin"), "schedules", "trip"), { fare: 999 }),
  );
  await assertFails(
    updateDoc(doc(user("u"), "tickets", "ticketA"), {
      status: "checked_in",
      checkedInAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(user("admin"), "tickets", "ticketA"), {
      status: "checked_in",
      checkedInAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(user("admin"), "tickets", "ticketA"), {
      status: "checked_in",
      checkedInAt: serverTimestamp(),
    }),
  );
});
test("cancelled trip rejects bookings", async () => {
  await assertSucceeds(
    updateDoc(doc(user("admin"), "schedules", "trip"), { status: "cancelled" }),
  );
  await assertFails(reserve(user("u"), "u", "ticketA"));
});
