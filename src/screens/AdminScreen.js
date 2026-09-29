import React, { useState } from "react";
import { View, Pressable, Alert, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import {
  Header,
  Page,
  Label,
  Button,
  Empty,
  Card,
  Notice,
} from "../components/UI";
import TripCard from "../components/TripCard";
import ScheduleForm from "./ScheduleForm";
import ScannerScreen from "./ScannerScreen";
import { changeTripStatus, deleteEmptyTrip } from "../services/adminService";
import { colors } from "../theme";
import { money, errorMessage } from "../utils/format";
export default function AdminScreen({ data, onPassenger }) {
  const [page, setPage] = useState("home"),
    [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false);
  const trip = data.schedules.find((s) => s.id === selected);
  async function run(action) {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      Alert.alert("Action failed", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const titles = {
    home: "Admin Dashboard",
    add: "Add Bus Route",
    edit: "Edit Bus Route",
    manage: "Manage Bus Routes",
    completed: "Completed Trips",
    bookings: "Bookings",
    scan: "QR Ticket Scanner",
    choose: "Choose Trip to Scan",
  };
  function confirm(title, message, action) {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: () => run(action) },
    ]);
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.admin }}>
      <Header
        title={titles[page]}
        color={colors.blue}
        back={page !== "home" ? () => setPage("home") : undefined}
      />
      {data.error ? (
        <Page>
          <Notice>{data.error}</Notice>
          <Button title="Retry" onPress={data.retry} />
          <Button title="Sign Out" onPress={() => run(() => signOut(auth))} />
        </Page>
      ) : data.loading ? (
        <ActivityIndicator style={{ flex: 1 }} />
      ) : page === "add" || page === "edit" ? (
        <ScheduleForm
          key={selected || "new"}
          trip={page === "edit" ? trip : undefined}
          onDone={() => setPage("manage")}
        />
      ) : page === "scan" && trip ? (
        <ScannerScreen trip={trip} />
      ) : (
        <Page contentStyle={{ padding: 20 }}>
          {page === "home" && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                {[
                  ["add", "add-road", "Add Bus Route", "#2196F3"],
                  ["manage", "alt-route", "Manage Routes", "#009688"],
                  ["choose", "qr-code-scanner", "Scan QR Code", "#673AB7"],
                  ["completed", "check-circle", "Completed Trips", "#FF9800"],
                ].map(([target, icon, title, color]) => (
                  <Pressable
                    accessibilityRole="button"
                    key={target}
                    onPress={() => {
                      setSelected(null);
                      setPage(target);
                    }}
                    style={{
                      width: "47%",
                      aspectRatio: 1,
                      backgroundColor: color,
                      opacity: 0.9,
                      borderRadius: 16,
                      padding: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      elevation: 5,
                    }}
                  >
                    <MaterialIcons name={icon} size={40} color="white" />
                    <Label
                      bold
                      style={{
                        color: "white",
                        fontSize: 16,
                        textAlign: "center",
                        marginTop: 16,
                      }}
                    >
                      {title}
                    </Label>
                  </Pressable>
                ))}
              </View>
              <Button
                title="Passenger View"
                onPress={onPassenger}
                outline
                style={{ marginTop: 24 }}
              />
              <Button
                title="Sign Out"
                outline
                color="#D32F2F"
                onPress={() => run(() => signOut(auth))}
              />
            </>
          )}
          {["manage", "completed", "choose"].includes(page) && (
            <>
              {!data.schedules.filter((s) =>
                page === "completed"
                  ? s.status !== "scheduled"
                  : s.status === "scheduled",
              ).length && <Empty text="No routes available" />}
              {data.schedules
                .filter((s) =>
                  page === "completed"
                    ? s.status !== "scheduled"
                    : s.status === "scheduled",
                )
                .map((s, i) => (
                  <TripCard key={s.id} trip={s} index={i}>
                    {page === "choose" ? (
                      <Button
                        title="Scan Tickets for This Trip"
                        onPress={() => {
                          setSelected(s.id);
                          setPage("scan");
                        }}
                      />
                    ) : (
                      <>
                        <Label style={{ marginTop: 10 }}>
                          Bookings: {Object.keys(s.seats).length}/{s.totalSeats}
                        </Label>
                        <Button
                          title="View Bookings"
                          onPress={() => {
                            setSelected(s.id);
                            setPage("bookings");
                          }}
                        />
                        {s.status === "scheduled" && (
                          <>
                            <Button
                              title="Edit"
                              disabled={busy || Object.keys(s.seats).length > 0}
                              outline
                              onPress={() => {
                                setSelected(s.id);
                                setPage("edit");
                              }}
                            />
                            {!!Object.keys(s.seats).length && (
                              <Label style={{ fontSize: 11 }}>
                                Booked trip details are locked to protect issued
                                tickets.
                              </Label>
                            )}
                            <Button
                              title="Mark Completed"
                              disabled={
                                busy || s.departureTime.toMillis() > Date.now()
                              }
                              outline
                              onPress={() =>
                                confirm(
                                  "Complete trip?",
                                  "Mark this trip as completed after the bus arrives at its final terminal.",
                                  () => changeTripStatus(s.id, "completed"),
                                )
                              }
                            />
                            <Button
                              title="Cancel Trip"
                              disabled={busy}
                              color="#EC6545"
                              outline
                              onPress={() =>
                                confirm(
                                  "Cancel trip?",
                                  "Bookings remain in history as cancelled. No real payment or refund is involved.",
                                  () => changeTripStatus(s.id, "cancelled"),
                                )
                              }
                            />
                          </>
                        )}
                        {!Object.keys(s.seats).length && (
                          <Button
                            title="Delete Empty Trip"
                            disabled={busy}
                            outline
                            color="#D32F2F"
                            onPress={() =>
                              confirm(
                                "Delete trip?",
                                "This removes an unbooked trip.",
                                () => deleteEmptyTrip(s.id),
                              )
                            }
                          />
                        )}
                      </>
                    )}
                  </TripCard>
                ))}
            </>
          )}
          {page === "bookings" && (
            <>
              <Label bold style={{ fontSize: 20 }}>
                {trip?.origin} → {trip?.destination}
              </Label>
              {!data.tickets.filter((t) => t.scheduleId === selected)
                .length && <Empty text="No bookings for this route." />}
              {data.tickets
                .filter((t) => t.scheduleId === selected)
                .map((t) => (
                  <Card key={t.id}>
                    <Label bold>Seat: {t.seatNumber}</Label>
                    <Label>Email: {t.email}</Label>
                    <Label>Demo paid: {money(t.fare)}</Label>
                    <Label>Status: {t.status.replace("_", " ")}</Label>
                    <Label selectable style={{ fontSize: 11 }}>
                      ID: {t.id}
                    </Label>
                  </Card>
                ))}
            </>
          )}
        </Page>
      )}
    </View>
  );
}
