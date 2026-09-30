import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Pressable, Alert, Switch } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { Button, Label, Page, Info, Notice } from "../components/UI";
import { colors } from "../theme";
import { money, dateLabel, errorMessage } from "../utils/format";
import { canBook } from "../utils/domain";
import {
  newBookingReference,
  bookBusSeatsAtomic,
} from "../services/bookingService";

export default function BookingModal({ trip, onClose, onSuccess }) {
  const [multiple, setMultiple] = useState(false);
  const [seats, setSeats] = useState([]);
  const [checkout, setCheckout] = useState(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const lock = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const open = canBook(trip, now);
  const occupied = seats.filter((seat) => trip.seats?.[String(seat)]);
  const selected = checkout ? checkout.seats : seats;
  const fare = checkout ? checkout.fare : trip.fare;
  const total = Math.round(fare * selected.length * 100) / 100;

  function toggleSeat(number) {
    if (lock.current || !open || trip.seats?.[String(number)]) return;

    setSeats((current) =>
      current.includes(number)
        ? current.filter((seat) => seat !== number)
        : multiple
          ? [...current, number].sort((a, b) => a - b)
          : [number]
    );
  }

  function changeMode(value) {
    if (lock.current) return;
    setMultiple(value);

    if (!value) {
      setSeats((current) =>
        current
          .filter((seat) => !trip.seats?.[String(seat)])
          .slice(0, 1)
      );
    }
  }

  function selectAll() {
    if (!multiple || lock.current || !open) return;

    setSeats(
      Array.from({ length: trip.totalSeats }, (_, i) => i + 1)
        .filter((seat) => !trip.seats?.[String(seat)])
    );
  }

  function review() {
    if (!open || !seats.length || occupied.length) return;

    // Reuse this checkout reference if confirmation is retried.
    setCheckout({
      seats: [...seats],
      fare: trip.fare,
      ref: newBookingReference(),
    });
  }

  async function pay() {
    if (lock.current || !checkout) return;

    lock.current = true;
    setBusy(true);

    try {
      await bookBusSeatsAtomic({
        scheduleId: trip.id,
        seatNumbers: checkout.seats,
        expectedFare: checkout.fare,
        bookingRef: checkout.ref,
      });

      onSuccess();
    } catch (error) {
      Alert.alert("Booking not completed", errorMessage(error));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function close() {
    if (!lock.current) onClose();
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={close}>
      <View
        style={{
          flex: 1,
          backgroundColor: "#0006",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            height: "88%",
            backgroundColor: "white",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <Page>
            <Label
              bold
              style={{ fontSize: 18, color: "black", marginBottom: 16 }}
            >
              {checkout ? "Payment Details" : "Select Seats"}
            </Label>

            <Label bold>
              {trip.origin} → {trip.destination}
            </Label>

            <Label style={{ fontSize: 13, marginTop: 4 }}>
              Departure: {dateLabel(trip.departureTime)}
            </Label>

            {!open && (
              <Notice>
                This trip is no longer available for new bookings.
              </Notice>
            )}

            {checkout ? (
              <>
                <Info icon="event-seat">
                  Seats: {selected.join(", ")}
                </Info>
                <Info icon="payments">
                  Fare per seat: {money(fare)}
                </Info>
                <Info icon="receipt">
                  Total: {money(total)} ({selected.length} seats)
                </Info>

                <Notice>
                  DEMO PAYMENT ONLY. No money is charged. Each seat
                  receives its own QR ticket.
                </Notice>

                <View
                  style={{
                    alignSelf: "center",
                    padding: 16,
                    backgroundColor: "white",
                  }}
                >
                  <QRCode
                    value={JSON.stringify({
                      app: "scanandgo-demo-payment",
                      amount: total,
                      currency: "PHP",
                      seats: selected,
                      reference: checkout.ref.id,
                    })}
                    size={160}
                  />
                </View>

                <Label style={{ fontSize: 12, marginVertical: 12 }}>
                  Seats are reserved together only after confirmation.
                  If another passenger takes one, choose available seats again.
                </Label>

                <Button
                  title={`Simulate Payment • ${money(total)}`}
                  busy={busy}
                  onPress={pay}
                />

                <Button
                  title="Back to Seats"
                  outline
                  disabled={busy}
                  onPress={() => {
                    if (lock.current) return;
                    setCheckout(null);
                    setSeats(
                      seats.filter(
                        (seat) => !trip.seats?.[String(seat)]
                      )
                    );
                  }}
                />
              </>
            ) : (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 16,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Label bold>Multiple Seats</Label>
                    <Label style={{ fontSize: 12 }}>
                      {multiple
                        ? "ON • Select any available seats"
                        : "OFF • Select one seat"}
                    </Label>
                  </View>

                  <Switch
                    accessibilityLabel="Multiple Seats"
                    value={multiple}
                    onValueChange={changeMode}
                    trackColor={{
                      false: "#B0BEC5",
                      true: colors.teal,
                    }}
                    thumbColor="white"
                    disabled={!open}
                  />
                </View>

                <Notice>
                  {multiple
                    ? "Choose as many available seats as you need. Tap a selected seat again to remove it."
                    : "Tap one seat. Turn Multiple Seats on to book more."}
                </Notice>

                {multiple && (
                  <Button
                    title="Select All Available Seats"
                    outline
                    disabled={!open}
                    onPress={selectAll}
                  />
                )}

                <View
                  style={{
                    alignItems: "flex-end",
                    marginVertical: 12,
                  }}
                >
                  <MaterialIcons
                    name="trip-origin"
                    color="#78909C"
                    size={28}
                  />
                  <Label style={{ fontSize: 10 }}>Driver</Label>
                </View>

                {/* Four seats per row is the layout, not a booking limit. */}
                {Array.from(
                  { length: Math.ceil(trip.totalSeats / 4) },
                  (_, row) => (
                    <View
                      key={row}
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      {[0, 1, 2, 3, 4].map((col) => {
                        if (col === 2) {
                          return (
                            <View key={col} style={{ flex: 0.65 }} />
                          );
                        }

                        const number =
                          row * 4 + (col > 2 ? col - 1 : col) + 1;

                        if (number > trip.totalSeats) {
                          return <View key={col} style={{ flex: 1 }} />;
                        }

                        const taken = !!trip.seats?.[String(number)];
                        const chosen = seats.includes(number);

                        return (
                          <Pressable
                            key={col}
                            accessibilityRole="button"
                            accessibilityLabel={`Seat ${number}${
                              taken ? ", taken" : ""
                            }`}
                            accessibilityState={{
                              selected: chosen,
                              disabled: taken || !open,
                            }}
                            disabled={taken || !open}
                            onPress={() => toggleSeat(number)}
                            style={{
                              flex: 1,
                              height: 48,
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: 1,
                              borderRadius: 8,
                              borderColor: taken
                                ? colors.orange
                                : "#B0BEC5",
                              backgroundColor: taken
                                ? "#FBE0D9"
                                : chosen
                                  ? colors.teal
                                  : "white",
                            }}
                          >
                            <Label
                              bold
                              style={{
                                color: taken
                                  ? colors.orange
                                  : chosen
                                    ? "white"
                                    : "black",
                              }}
                            >
                              {number}
                            </Label>
                          </Pressable>
                        );
                      })}
                    </View>
                  )
                )}

                <Label style={{ fontSize: 12, marginVertical: 12 }}>
                  White: Available • Teal: Selected • Orange: Taken
                </Label>

                <Label bold>
                  Selected seats: {seats.length ? seats.join(", ") : "None"}
                </Label>
                <Label>Fare per seat: {money(trip.fare)}</Label>
                <Label bold style={{ marginTop: 8 }}>
                  Total: {money(total)}
                </Label>

                {!!occupied.length && (
                  <Notice>
                    Seat(s) {occupied.join(", ")} are now taken.
                    Clear your selection and choose again.
                  </Notice>
                )}

                <Button
                  title="Clear Selection"
                  outline
                  disabled={!seats.length}
                  onPress={() => setSeats([])}
                />

                <Notice>
                  Non-stop, terminal-to-terminal only.
                  No intermediate boarding or drop-offs.
                </Notice>

                <Button
                  title={`Confirm ${seats.length || "Selected"} Seat(s)`}
                  disabled={!seats.length || !open || !!occupied.length}
                  onPress={review}
                />
              </>
            )}

            <Button
              title="Close"
              outline
              color="#647480"
              disabled={busy}
              onPress={close}
            />
          </Page>
        </View>
      </View>
    </Modal>
  );
}