import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { milliseconds } from "../utils/domain";
import { errorMessage } from "../utils/format";

export function expandTicket(id, t) {
  if (t.kind !== "group") return [{ ...t, id }];

  return Object.keys(t.seatMap)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => ({
      ...t,
      id: id.slice(0, 18) + key.padStart(2, "0"),
      bookingId: id,
      seatNumber: Number(key),
      status: t.checkIns?.[key] ? "checked_in" : "booked",
      checkedInAt: t.checkIns?.[key] || null,
    }));
}

export function useLiveData(userId, admin) {
  const [schedules, setSchedules] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState({
    schedules: true,
    tickets: true,
  });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setSchedules([]);
    setTickets([]);
    setError("");
    setPending({ schedules: true, tickets: true });

    const fail = (e) => {
      setError(errorMessage(e));
      setPending({ schedules: false, tickets: false });
    };

    const unsubS = onSnapshot(
      collection(db, "schedules"),
      (snap) => {
        setSchedules(
          snap.docs
            .map((d) => ({ ...d.data(), id: d.id }))
            .sort(
              (a, b) =>
                milliseconds(a.departureTime) -
                milliseconds(b.departureTime)
            )
        );

        setPending((p) => ({ ...p, schedules: false }));
      },
      fail
    );

    const q = admin
      ? collection(db, "tickets")
      : query(
          collection(db, "tickets"),
          where("userId", "==", userId)
        );

    const unsubT = onSnapshot(
      q,
      (snap) => {
        setTickets(
          snap.docs
            .flatMap((d) => expandTicket(d.id, d.data()))
            .sort(
              (a, b) =>
                milliseconds(b.departureTime) -
                milliseconds(a.departureTime)
            )
        );

        setPending((p) => ({ ...p, tickets: false }));
      },
      fail
    );

    return () => {
      unsubS();
      unsubT();
    };
  }, [userId, admin, retry]);

  return {
    schedules,
    tickets,
    error,
    loading: pending.schedules || pending.tickets,
    retry: () => setRetry((n) => n + 1),
  };
}