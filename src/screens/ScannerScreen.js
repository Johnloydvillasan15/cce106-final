import React, { useRef, useState } from "react";
import { View, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Page, Label, Button, Field, Notice } from "../components/UI";
import { checkInTicket } from "../services/adminService";
import { errorMessage } from "../utils/format";
export default function ScannerScreen({ trip }) {
  const [permission, requestPermission] = useCameraPermissions(),
    [paused, setPaused] = useState(false),
    [manual, setManual] = useState("");
  const lock = useRef(false);
  async function scan(value) {
    if (lock.current) return;
    lock.current = true;
    setPaused(true);
    try {
      const t = await checkInTicket(value, trip.id);
      Alert.alert(
        "Check-in successful",
        `Seat ${t.seatNumber}\n${t.email}\n${t.origin} → ${t.destination}`,
      );
    } catch (e) {
      Alert.alert("Ticket not accepted", errorMessage(e));
    }
  }
  return (
    <Page>
      <Label bold>
        {trip.origin} → {trip.destination}
      </Label>
      <Notice>
        Verify that the passenger is boarding this bus at its start terminal.
        This scanner checks demo tickets online.
      </Notice>
      {permission?.granted ? (
        <View style={{ height: 320, borderRadius: 16, overflow: "hidden" }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={paused ? undefined : ({ data }) => scan(data)}
          />
        </View>
      ) : (
        <Button title="Allow Camera" onPress={requestPermission} />
      )}
      {paused && (
        <Button
          title="Scan Next Ticket"
          onPress={() => {
            lock.current = false;
            setPaused(false);
            setManual("");
          }}
        />
      )}
      <Field
        label="Or enter the 20-character ticket ID"
        value={manual}
        onChangeText={setManual}
        autoCapitalize="none"
      />
      <Button
        title="Verify & Check In"
        disabled={paused || !manual.trim()}
        onPress={() =>
          scan(
            JSON.stringify({ app: "scanandgo", v: 1, ticketId: manual.trim() }),
          )
        }
      />
    </Page>
  );
}
