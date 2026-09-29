import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Pressable, Alert } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { Button, Label, Page, Info, Notice } from "../components/UI";
import { colors } from "../theme";
import { money, dateLabel, errorMessage } from "../utils/format";
import { canBook } from "../utils/domain";
import {
  newTicketReference,
  bookBusSeatAtomic,
} from "../services/bookingService";
export default function BookingModal({ trip, onClose, onSuccess }) {
  const [seat, setSeat] = useState(null),
    [payment, setPayment] = useState(false),
    [busy, setBusy] = useState(false),
    [expectedFare, setExpectedFare] = useState(null);
  const ticketRef = useRef(null),
    lock = useRef(false);
  useEffect(() => {
    ticketRef.current = newTicketReference();
  }, []);
  async function pay() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await bookBusSeatAtomic({
        scheduleId: trip.id,
        seatNumber: seat,
        expectedFare,
        ticketRef: ticketRef.current,
      });
      onSuccess();
    } catch (e) {
      Alert.alert("Booking not completed", errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const open = canBook(trip);
  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={() => !busy && onClose()}
    >
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
              {payment ? "Payment Details" : "Select a Seat"}
            </Label>
            <Label bold>
              {trip.origin} â†’ {trip.destination}
            </Label>
            <Label style={{ fontSize: 13, marginTop: 4 }}>
              Departure: {dateLabel(trip.departureTime)}
            </Label>
            {!open && (
              <Notice>This trip is no longer available for booking.</Notice>
            )}
            {payment ? (
              <>
                <Info icon="payments">Price: {money(expectedFare)}</Info>
                <Info icon="event-seat">Seat: #{seat}</Info>
                <Info icon="ac-unit">
                  Aircon: {trip.isAircon ? "Yes" : "No"}
                </Info>
                <Notice>
                  DEMO PAYMENT ONLY â€” no money is charged. The QR below is a
                  demonstration, not a GCash or bank payment code.
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
                      amount: expectedFare,
                      currency: "PHP",
                      reference: ticketRef.current?.id,
                    })}
                    size={160}
                  />
                </View>
                <Label style={{ fontSize: 12, marginVertical: 12 }}>
                  Your seat is reserved only after you confirm. Another
                  passenger may book it while this screen is open.
                </Label>
                <Button
                  title={`Simulate Payment â€¢ ${money(expectedFare)}`}
                  busy={busy}
                  disabled={!open}
                  onPress={pay}
                />
                <Button
                  title="Back to Seats"
                  disabled={busy}
                  outline
                  onPress={() => setPayment(false)}
                />
              </>
            ) : (
              <>
                <View style={{ alignItems: "flex-end", marginVertical: 16 }}>
                  <MaterialIcons name="trip-origin" color="#78909C" size={28} />
                  <Label style={{ fontSize: 10 }}>Driver</Label>
                </View>
                {Array.from(
                  { length: Math.ceil(trip.totalSeats / 4) },
                  (_, row) => (
                    <View
                      key={row}
                      style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}
                    >
                      {[0, 1, 2, 3, 4].map((col) => {
                        if (col === 2)
                          return <View key={col} style={{ flex: 0.65 }} />;
                        const number = row * 4 + (col > 2 ? col - 1 : col) + 1;
                        if (number > trip.totalSeats)
                          return <View key={col} style={{ flex: 1 }} />;
                        const taken = !!trip.seats[String(number)],
                          selected = seat === number;
                        return (
                          <Pressable
                            key={col}
                            accessibilityRole="button"
                            accessibilityLabel={`Seat ${number}${taken ? ", taken" : ""}`}
                            disabled={taken || !open}
                            onPress={() => setSeat(number)}
                            style={{
                              flex: 1,
                              height: 48,
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: 1,
                              borderRadius: 8,
                              borderColor: taken ? colors.orange : "#B0BEC5",
                              backgroundColor: taken
                                ? "#FBE0D9"
                                : selected
                                  ? colors.teal
                                  : "white",
                            }}
                          >
                            <Label
                              bold
                              style={{
                                color: taken
                                  ? colors.orange
                                  : selected
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
                  ),
                )}
                <Label style={{ fontSize: 12, marginVertical: 12 }}>
                  â–¡ Available â–  Teal: Selected â–  Orange: Taken
                </Label>
                <Notice>
                  Non-stop, terminal-to-terminal only. No intermediate boarding
                  or drop-offs.
                </Notice>
                <Button
                  title="Confirm Seat"
                  disabled={!seat || !open || !!trip.seats[String(seat)]}
                  onPress={() => {
                    setExpectedFare(trip.fare);
                    setPayment(true);
                  }}
                />
              </>
            )}
            <Button
              title="Close"
              outline
              color="#647480"
              disabled={busy}
              onPress={onClose}
            />
          </Page>
        </View>
      </View>
    </Modal>
  );
}

