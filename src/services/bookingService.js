import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";
import { canBook } from "../utils/domain";

// Create this reference once per payment screen. Reusing it makes retries idempotent.
export const newTicketReference = () => doc(collection(db, "tickets"));
export async function bookBusSeatAtomic({
  scheduleId,
  seatNumber,
  expectedFare,
  ticketRef,
}) {
  const user = auth.currentUser;
  if (!user) throw Error("Please log in first.");
  const scheduleRef = doc(db, "schedules", scheduleId);
  return runTransaction(db, async (tx) => {
    const [existing, snapshot] = await Promise.all([
      tx.get(ticketRef),
      tx.get(scheduleRef),
    ]);
    if (existing.exists()) {
      if (existing.data().userId !== user.uid)
        throw Error("Invalid booking reference.");
      return ticketRef.id;
    }
    if (!snapshot.exists()) throw Error("This trip no longer exists.");
    const s = snapshot.data();
    if (!canBook(s))
      throw Error(
        "This trip is closed or fully booked. Please choose another trip.",
      );
    if (s.fare !== expectedFare)
      throw Error(
        "The fare changed. Close payment and review the updated fare.",
      );
    if (
      !Number.isInteger(seatNumber) ||
      seatNumber < 1 ||
      seatNumber > s.totalSeats
    )
      throw Error("Invalid seat.");
    if (s.seats[String(seatNumber)])
      throw Error("That seat was just booked. Please select another seat.");
    tx.set(ticketRef, {
      userId: user.uid,
      email: user.email,
      scheduleId,
      seatNumber,
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
      seats: { ...s.seats, [String(seatNumber)]: ticketRef.id },
      lastTicketId: ticketRef.id,
    });
    return ticketRef.id;
  });
}
