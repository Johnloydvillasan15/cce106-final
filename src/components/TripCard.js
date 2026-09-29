import React from "react";
import { View } from "react-native";
import { Card, Label, Info, Button } from "./UI";
import { colors } from "../theme";
import { canBook } from "../utils/domain";
import { dateLabel, money } from "../utils/format";
export default function TripCard({
  trip,
  index = 0,
  onBook,
  children,
  now = Date.now(),
}) {
  const available = trip.totalSeats - Object.keys(trip.seats || {}).length;
  const open = canBook(trip, now),
    status =
      trip.status !== "scheduled"
        ? trip.status
        : available === 0
          ? "Full"
          : open
            ? "Available"
            : "Ready";
  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Label>Route #{index + 1}</Label>
        <View
          style={{
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 4,
            backgroundColor: open ? "#D1EBEB" : "#FBE0D9",
          }}
        >
          <Label
            style={{ fontSize: 12, color: open ? colors.teal : colors.orange }}
          >
            {status}
          </Label>
        </View>
      </View>
      <Label
        bold
        style={{ fontSize: 18, color: "black", marginTop: 8, marginBottom: 12 }}
      >
        {trip.origin} → {trip.destination}
      </Label>
      <Info icon="access-time">Departure: {dateLabel(trip.departureTime)}</Info>
      <Info icon="event-seat">
        Available Seats: {available}/{trip.totalSeats}
      </Info>
      <Info icon="payments">Price: {money(trip.fare)}</Info>
      <Info icon="ac-unit">Aircon: {trip.isAircon ? "Yes" : "No"}</Info>
      <Info icon="directions-bus">Plate Number: {trip.plateNumber}</Info>
      {onBook && (
        <Button
          title={
            open
              ? "Book Ticket"
              : available === 0
                ? "Fully Booked"
                : "Booking Closed"
          }
          onPress={onBook}
          disabled={!open}
          style={{ marginTop: 16 }}
        />
      )}
      {children}
    </Card>
  );
}
