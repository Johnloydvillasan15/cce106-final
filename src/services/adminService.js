import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { validateSchedule, parseTicketQR } from "../utils/domain";

export async function saveSchedule(values, id) {
  validateSchedule(values);

  const ref = id
    ? doc(db, "schedules", id)
    : doc(collection(db, "schedules"));

  const data = {
    ...values,
    origin: values.origin.trim(),
    destination: values.destination.trim(),
    plateNumber: values.plateNumber.trim().toUpperCase(),
    departureTime: Timestamp.fromDate(values.departureTime),
  };

  await runTransaction(db, async (tx) => {
    if (id) {
      const old = await tx.get(ref);

      if (!old.exists()) throw Error("Trip not found.");

      if (
        Object.keys(old.data().seats).length ||
        old.data().status !== "scheduled"
      ) {
        throw Error("Only unbooked scheduled trips can be edited.");
      }

      tx.update(ref, data);
    } else {
      tx.set(ref, {
        ...data,
        seats: {},
        lastTicketId: "",
        status: "scheduled",
        createdAt: serverTimestamp(),
      });
    }
  });
}

export async function changeTripStatus(id, status) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "schedules", id);
    const snap = await tx.get(ref);

    if (!snap.exists() || snap.data().status !== "scheduled") {
      throw Error("This trip is already closed.");
    }

    if (!["completed", "cancelled"].includes(status)) {
      throw Error("Invalid status.");
    }

    if (
      status === "completed" &&
      snap.data().departureTime.toMillis() > Date.now()
    ) {
      throw Error("A future trip cannot be marked completed.");
    }

    tx.update(ref, { status });
  });
}

export async function deleteEmptyTrip(id) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "schedules", id);
    const snap = await tx.get(ref);

    if (!snap.exists()) return;

    if (Object.keys(snap.data().seats).length) {
      throw Error("Booked trips must be cancelled, not deleted.");
    }

    tx.delete(ref);
  });
}

export async function checkInTicket(qr, expectedScheduleId) {
  const id = parseTicketQR(qr);

  if (!expectedScheduleId) throw Error("Select the bus trip first.");

  return runTransaction(db, async (tx) => {
    let ref = doc(db, "tickets", id);
    let ticket = await tx.get(ref);
    let key = null;

    // Resolve the individual seat QR to its shared checkout record.
    if (
      !ticket.exists() &&
      /^(0[1-9]|[1-5][0-9]|60)$/.test(id.slice(18))
    ) {
      key = String(Number(id.slice(18)));
      ref = doc(db, "tickets", id.slice(0, 18) + "00");
      ticket = await tx.get(ref);
    }

    if (!ticket.exists()) throw Error("Ticket not found.");

    const t = ticket.data();

    if (t.scheduleId !== expectedScheduleId) {
      throw Error("This ticket is for a different bus trip.");
    }

    const trip = await tx.get(doc(db, "schedules", t.scheduleId));

    if (!trip.exists() || trip.data().status !== "scheduled") {
      throw Error("This trip is closed.");
    }

    if (t.kind === "group") {
      if (
        !key ||
        t.seatMap?.[key] !== ref.id ||
        trip.data().seats[key] !== ref.id ||
        t.paymentStatus !== "demo_paid"
      ) {
        throw Error("Invalid seat QR ticket.");
      }

      if (t.checkIns?.[key]) {
        throw Error("This seat has already been checked in.");
      }

      tx.update(ref, {
        [`checkIns.${key}`]: serverTimestamp(),
        lastCheckedInSeat: key,
      });

      return {
        ...t,
        id,
        seatNumber: Number(key),
        status: "checked_in",
      };
    }

    // Existing single-seat ticket documents remain supported.
    if (key || t.status !== "booked") {
      throw Error(
        "This ticket has already been checked in or is invalid."
      );
    }

    if (
      t.paymentStatus !== "demo_paid" ||
      trip.data().seats[String(t.seatNumber)] !== id
    ) {
      throw Error("Invalid reservation.");
    }

    tx.update(ref, {
      status: "checked_in",
      checkedInAt: serverTimestamp(),
    });

    return t;
  });
}