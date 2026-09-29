import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { canBook } from "../utils/domain";

export const MAX_SEATS_PER_BOOKING = 4;

export const newTicketReference = () =>
  doc(collection(db, "tickets"));

export async function bookBusSeatsAtomic({
  scheduleId,
  seatNumbers,
  expectedFare,
  ticketRefs,
}) {
  const user = auth.currentUser;

  if (!user) {
    throw Error("Please log in first.");
  }

  if (
    !Array.isArray(seatNumbers) ||
    seatNumbers.length < 1 ||
    seatNumbers.length > MAX_SEATS_PER_BOOKING ||
    new Set(seatNumbers).size !== seatNumbers.length ||
    seatNumbers.some(
      (seat) => !Number.isInteger(seat) || seat < 1,
    )
  ) {
    throw Error("Choose between 1 and 4 different seats.");
  }

  if (
    !Array.isArray(ticketRefs) ||
    ticketRefs.length !== seatNumbers.length ||
    new Set(ticketRefs.map((ref) => ref.id)).size !==
      ticketRefs.length
  ) {
    throw Error(
      "Invalid booking references. Reopen the seat picker.",
    );
  }

  const scheduleRef = doc(db, "schedules", scheduleId);

  return runTransaction(db, async (tx) => {
    // Read before writing. Reuse these IDs for retries.
    const existing = [];

    for (const ref of ticketRefs) {
      existing.push(await tx.get(ref));
    }

    // A previous attempt may already have completed.
    if (existing.every((snapshot) => snapshot.exists())) {
      const matches = existing.every((snapshot, index) => {
        const ticket = snapshot.data();

        return (
          ticket.userId === user.uid &&
          ticket.scheduleId === scheduleId &&
          ticket.seatNumber === seatNumbers[index] &&
          ticket.fare === expectedFare
        );
      });

      if (!matches) {
        throw Error("The booking references do not match.");
      }

      return ticketRefs.map((ref) => ref.id);
    }

    if (existing.some((snapshot) => snapshot.exists())) {
      throw Error(
        "Booking references are inconsistent. Check Your Tickets before retrying.",
      );
    }

    const snapshot = await tx.get(scheduleRef);

    if (!snapshot.exists()) {
      throw Error("This trip no longer exists.");
    }

    const schedule = snapshot.data();

    if (!canBook(schedule)) {
      throw Error("This trip is closed or fully booked.");
    }

    if (schedule.fare !== expectedFare) {
      throw Error(
        "The fare changed. Go back to seats and review the new total.",
      );
    }

    if (
      seatNumbers.some((seat) => seat > schedule.totalSeats)
    ) {
      throw Error("One of the selected seats is invalid.");
    }

    const occupied = seatNumbers.filter(
      (seat) => schedule.seats[String(seat)],
    );

    if (occupied.length) {
      throw Error(
        `Seat(s) ${occupied.join(", ")} were just booked. No seats were reserved. Go back and select available seats.`,
      );
    }

    const updatedSeats = { ...schedule.seats };
    const ids = ticketRefs.map((ref) => ref.id);

    seatNumbers.forEach((seat, index) => {
      const ticket = {
        userId: user.uid,
        email: user.email,
        scheduleId,
        seatNumber: seat,
        origin: schedule.origin,
        destination: schedule.destination,
        departureTime: schedule.departureTime,
        plateNumber: schedule.plateNumber,
        isAircon: schedule.isAircon,
        fare: schedule.fare,
        paymentStatus: "demo_paid",
        status: "booked",
        createdAt: serverTimestamp(),
      };

      // Security rules use the first ticket to check the group.
      if (index === 0) {
        ticket.bookingSeats = seatNumbers.map(String);
        ticket.bookingTickets = ids;
      }

      tx.set(ticketRefs[index], ticket);
      updatedSeats[String(seat)] = ids[index];
    });

    tx.update(scheduleRef, {
      seats: updatedSeats,
      lastTicketId: ids[0],
    });

    return ids;
  });
}

// Compatibility with existing single-seat calls.
export async function bookBusSeatAtomic({
  scheduleId,
  seatNumber,
  expectedFare,
  ticketRef,
}) {
  const ids = await bookBusSeatsAtomic({
    scheduleId,
    seatNumbers: [seatNumber],
    expectedFare,
    ticketRefs: [ticketRef || newTicketReference()],
  });

  return ids[0];
}