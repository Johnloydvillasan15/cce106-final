import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { canBook } from "../utils/domain";

export function newBookingReference() {
  const id = doc(collection(db, "tickets")).id.slice(0, 18) + "00";
  return doc(db, "tickets", id);
}

export async function bookBusSeatsAtomic({
  scheduleId,
  seatNumbers,
  expectedFare,
  bookingRef,
}) {
  const user = auth.currentUser;
  if (!user) throw Error("Please log in first.");

  if (
    !Array.isArray(seatNumbers) ||
    !seatNumbers.length ||
    new Set(seatNumbers).size !== seatNumbers.length ||
    seatNumbers.some((n) => !Number.isInteger(n) || n < 1)
  ) {
    throw Error("Choose at least one available seat.");
  }

  if (
    !bookingRef ||
    !/^[a-zA-Z0-9]{18}00$/.test(bookingRef.id) ||
    bookingRef.path !== `tickets/${bookingRef.id}`
  ) {
    throw Error("Invalid checkout. Go back to seats and try again.");
  }

  const keys = [...seatNumbers]
    .sort((a, b) => a - b)
    .map(String);

  const scheduleRef = doc(db, "schedules", scheduleId);

  const ticketIds = keys.map(
    (key) => bookingRef.id.slice(0, 18) + key.padStart(2, "0")
  );

  return runTransaction(db, async (tx) => {
    // Reusing the checkout ID prevents duplicate bookings on retry.
    const previous = await tx.get(bookingRef);

    if (previous.exists()) {
      const t = previous.data();
      const storedKeys = Object.keys(t.seatMap || {});

      if (
        t.kind !== "group" ||
        t.userId !== user.uid ||
        t.scheduleId !== scheduleId ||
        t.fare !== expectedFare ||
        storedKeys.length !== keys.length ||
        keys.some((key) => t.seatMap[key] !== bookingRef.id)
      ) {
        throw Error("This checkout does not match the existing booking.");
      }

      return ticketIds;
    }

    const snapshot = await tx.get(scheduleRef);
    if (!snapshot.exists()) throw Error("This trip no longer exists.");

    const s = snapshot.data();

    if (!canBook(s)) {
      throw Error("This trip is closed or fully booked.");
    }

    if (s.fare !== expectedFare) {
      throw Error("The fare changed. Go back to seats and review the total.");
    }

    if (seatNumbers.some((n) => n > s.totalSeats)) {
      throw Error("A selected seat does not exist on this bus.");
    }

    const taken = keys.filter((key) => s.seats?.[key]);

    if (taken.length) {
      throw Error(
        `Seats ${taken.join(", ")} are taken. No seats were reserved. ` +
        "Go back and choose available seats."
      );
    }

    const seatMap = Object.fromEntries(
      keys.map((key) => [key, bookingRef.id])
    );

    tx.set(bookingRef, {
      kind: "group",
      userId: user.uid,
      email: user.email,
      scheduleId,
      seatMap,
      checkIns: {},
      lastCheckedInSeat: "",
      origin: s.origin,
      destination: s.destination,
      departureTime: s.departureTime,
      plateNumber: s.plateNumber,
      isAircon: s.isAircon,
      fare: s.fare,
      paymentStatus: "demo_paid",
      status: "booked",
      createdAt: serverTimestamp(),
    });

    tx.update(scheduleRef, {
      seats: { ...s.seats, ...seatMap },
      lastTicketId: bookingRef.id,
    });

    return ticketIds;
  });
}

export async function bookBusSeatAtomic({
  scheduleId,
  seatNumber,
  expectedFare,
}) {
  const ids = await bookBusSeatsAtomic({
    scheduleId,
    seatNumbers: [seatNumber],
    expectedFare,
    bookingRef: newBookingReference(),
  });

  return ids[0];
}