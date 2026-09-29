import React, { useState } from "react";
import {
  View,
  Switch,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Page, Field, Button, Label, Notice } from "../components/UI";
import { saveSchedule } from "../services/adminService";
import { dateLabel, errorMessage } from "../utils/format";

// Get the Philippine date and time regardless of the phone's timezone.
function manilaParts(date) {
  const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const hour24 = shifted.getUTCHours();

  return {
    day: shifted.toISOString().slice(0, 10),
    hour: String(hour24 % 12 || 12),
    minute: String(shifted.getUTCMinutes()).padStart(2, "0"),
    period: hour24 >= 12 ? "PM" : "AM",
  };
}

// Convert the selected 12-hour time into a date for Firebase.
function departureDate(day, hour, minute, period) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error("Enter the departure date as YYYY-MM-DD.");
  }

  if (
    !/^\d{1,2}$/.test(hour) ||
    Number(hour) < 1 ||
    Number(hour) > 12
  ) {
    throw new Error("Enter an hour from 1 to 12.");
  }

  if (!/^\d{1,2}$/.test(minute) || Number(minute) > 59) {
    throw new Error("Enter minutes from 00 to 59.");
  }

  if (period !== "AM" && period !== "PM") {
    throw new Error("Choose AM or PM.");
  }

  const hour24 = (Number(hour) % 12) + (period === "PM" ? 12 : 0);

  const result = new Date(
    `${day}T${String(hour24).padStart(2, "0")}:${minute.padStart(
      2,
      "0",
    )}:00+08:00`,
  );

  if (
    Number.isNaN(result.getTime()) ||
    manilaParts(result).day !== day
  ) {
    throw new Error("Choose a valid departure date.");
  }

  return result;
}

export default function ScheduleForm({ trip, onDone }) {
  const [initial] = useState(() =>
    manilaParts(
      trip?.departureTime?.toDate() ||
        new Date(Date.now() + 86400000),
    ),
  );

  const [origin, setOrigin] = useState(trip?.origin || "");
  const [destination, setDestination] = useState(
    trip?.destination || "",
  );
  const [plate, setPlate] = useState(trip?.plateNumber || "");
  const [seats, setSeats] = useState(
    String(trip?.totalSeats || 20),
  );
  const [fare, setFare] = useState(String(trip?.fare || ""));
  const [aircon, setAircon] = useState(trip?.isAircon || false);

  const [day, setDay] = useState(initial.day);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState(initial.period);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPeriod, setShowPeriod] = useState(false);
  const [busy, setBusy] = useState(false);

  let departure = null;
  let timeError = "";

  try {
    departure = departureDate(day, hour, minute, period);
  } catch (error) {
    timeError = error.message;
  }

  async function save() {
    if (busy) return;

    if (!departure) {
      Alert.alert("Check departure time", timeError);
      return;
    }

    setBusy(true);

    try {
      await saveSchedule(
        {
          origin,
          destination,
          plateNumber: plate,
          totalSeats: Number(seats),
          fare: Number(fare),
          isAircon: aircon,
          departureTime: departure,
        },
        trip?.id,
      );

      onDone();
    } catch (error) {
      Alert.alert("Unable to save", errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <Notice>
        Enter designated terminals in the Davao Region. This is a
        non-stop trip; no sub-terminal stops are offered. Times
        below are Philippine time.
      </Notice>

      <Field
        label="Starting Point (Point A)"
        value={origin}
        onChangeText={setOrigin}
      />

      <Field
        label="Destination (Point B)"
        value={destination}
        onChangeText={setDestination}
      />

      <Field
        label="Bus Plate Number"
        value={plate}
        onChangeText={setPlate}
        autoCapitalize="characters"
      />

      {Platform.OS === "web" ? (
        <Field
          label="Departure date (YYYY-MM-DD)"
          value={day}
          onChangeText={setDay}
          placeholder="2026-10-01"
          maxLength={10}
        />
      ) : (
        <>
          <Button
            outline
            title={`Departure date: ${day}`}
            onPress={() => {
              setShowPeriod(false);
              setShowDatePicker(true);
            }}
          />

          {showDatePicker && (
            <DateTimePicker
              value={new Date(`${day}T12:00:00+08:00`)}
              mode="date"
              timeZoneName="Asia/Manila"
              minimumDate={new Date()}
              onChange={(event, value) => {
                setShowDatePicker(false);

                if (event.type === "set" && value) {
                  setDay(manilaParts(value).day);
                }
              }}
            />
          )}
        </>
      )}

      <Label
        bold
        style={{ marginTop: 16, marginBottom: 10 }}
      >
        Departure time (Philippine time)
      </Label>

      <View style={styles.timeRow}>
        <View style={styles.timeColumn}>
          <Field
            label="Hour (1–12)"
            value={hour}
            onChangeText={(value) =>
              setHour(value.replace(/\D/g, ""))
            }
            keyboardType="number-pad"
            maxLength={2}
            placeholder="8"
            editable={!busy}
          />
        </View>

        <View style={styles.timeColumn}>
          <Field
            label="Minute"
            value={minute}
            onChangeText={(value) =>
              setMinute(value.replace(/\D/g, ""))
            }
            onBlur={() => {
              if (minute) {
                setMinute(minute.padStart(2, "0"));
              }
            }}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="00"
            editable={!busy}
          />
        </View>

        <View style={styles.timeColumn}>
          <Label style={{ marginBottom: 6 }}>
            AM / PM
          </Label>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`AM or PM: ${period}`}
            accessibilityState={{
              expanded: showPeriod,
              disabled: busy,
            }}
            disabled={busy}
            style={styles.periodButton}
            onPress={() => setShowPeriod((open) => !open)}
          >
            <Label>{period}</Label>
            <Label>{showPeriod ? "▴" : "▾"}</Label>
          </Pressable>

          {showPeriod && (
            <View style={styles.options}>
              {["AM", "PM"].map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${option}`}
                  accessibilityState={{
                    selected: period === option,
                  }}
                  style={[
                    styles.option,
                    period === option && styles.selectedOption,
                  ]}
                  onPress={() => {
                    setPeriod(option);
                    setShowPeriod(false);
                  }}
                >
                  <Label bold={period === option}>
                    {option}
                  </Label>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      <Label
        style={{
          marginBottom: 16,
          color: timeError ? "#B42318" : "#1A3A66",
        }}
      >
        {departure
          ? `Departure: ${dateLabel(departure)}`
          : timeError}
      </Label>

      <Field
        label="Total Seats (1–60)"
        value={seats}
        onChangeText={setSeats}
        keyboardType="number-pad"
      />

      <Field
        label="Ticket Price (PHP)"
        value={fare}
        onChangeText={setFare}
        keyboardType="decimal-pad"
      />

      <View style={styles.airconRow}>
        <Label>Air-conditioned Bus</Label>
        <Switch
          value={aircon}
          onValueChange={setAircon}
        />
      </View>

      <Button
        title={trip ? "Save Changes" : "Add Route"}
        onPress={save}
        busy={busy}
        disabled={!departure}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  timeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  timeColumn: {
    flex: 1,
  },
  periodButton: {
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#BCC5CA",
    borderRadius: 5,
    backgroundColor: "white",
  },
  options: {
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BCC5CA",
    borderRadius: 5,
    overflow: "hidden",
  },
  option: {
    minHeight: 48,
    padding: 12,
    backgroundColor: "white",
  },
  selectedOption: {
    backgroundColor: "#E1F4F3",
  },
  airconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});