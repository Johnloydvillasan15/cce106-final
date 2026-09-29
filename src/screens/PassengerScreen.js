import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  signOut,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import QRCode from "react-native-qrcode-svg";

import { auth } from "../../firebaseConfig";
import {
  Header,
  Page,
  Label,
  Button,
  Card,
  Empty,
  Notice,
  Field,
} from "../components/UI";
import TripCard from "../components/TripCard";
import BookingModal from "./BookingModal";
import { colors } from "../theme";
import { money, dateLabel, errorMessage } from "../utils/format";

// Profile dashboard and account forms.
function ProfileDashboard({ user, onAdmin }) {
  const [mode, setMode] = useState(null);
  const [savedName, setSavedName] = useState(user.displayName || "");
  const [name, setName] = useState(user.displayName || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const working = useRef(false);

  useEffect(() => {
    setSavedName(user.displayName || "");
    setName(user.displayName || "");
    setMode(null);
    clearPasswords();
  }, [user.uid]);

  function clearPasswords() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  function closeForm() {
    if (working.current) return;

    clearPasswords();
    setName(savedName);
    setMode(null);
  }

  function getCurrentUser() {
    const account = auth.currentUser;

    if (!account || account.uid !== user.uid) {
      throw new Error("Please sign in again to update your account.");
    }

    return account;
  }

  async function saveName() {
    if (working.current) return;

    const cleanName = name.trim();

    if (!cleanName) {
      Alert.alert("Name required", "Please enter your full name.");
      return;
    }

    if (cleanName.length > 80) {
      Alert.alert(
        "Name too long",
        "Please use a name with 80 characters or fewer.",
      );
      return;
    }

    working.current = true;
    setBusy(true);

    try {
      const account = getCurrentUser();

      await updateProfile(account, {
        displayName: cleanName,
      });

      setSavedName(cleanName);
      setName(cleanName);
      setMode(null);

      Alert.alert("Profile updated", "Your name has been saved.");
    } catch (error) {
      Alert.alert("Unable to update profile", errorMessage(error));
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  async function savePassword() {
    if (working.current) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(
        "Missing information",
        "Please complete all three password fields.",
      );
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert(
        "Password too short",
        "Your new password must contain at least 6 characters.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        "Passwords do not match",
        "Your new password and confirmation must match.",
      );
      return;
    }

    if (newPassword === currentPassword) {
      Alert.alert(
        "Choose a different password",
        "Your new password must differ from your current password.",
      );
      return;
    }

    working.current = true;
    setBusy(true);

    try {
      const account = getCurrentUser();

      if (
        !account.email ||
        !account.providerData.some(
          (provider) => provider.providerId === "password",
        )
      ) {
        throw new Error(
          "Password changes are available for email and password accounts.",
        );
      }

      const credential = EmailAuthProvider.credential(
        account.email,
        currentPassword,
      );

      // Verify the current password before changing it.
      await reauthenticateWithCredential(account, credential);

      // Firebase Authentication manages the password.
      // Never store passwords in Firestore.
      await updatePassword(account, newPassword);

      setMode(null);

      Alert.alert(
        "Password changed",
        "Use your new password the next time you sign in.",
      );
    } catch (error) {
      const messages = {
        "auth/wrong-password": "Your current password is incorrect.",
        "auth/invalid-credential":
          "Your current password is incorrect. Please try again.",
        "auth/invalid-login-credentials":
          "Your current password is incorrect. Please try again.",
        "auth/weak-password":
          "Choose a stronger password with at least 6 characters.",
        "auth/password-does-not-meet-requirements":
          "Your new password does not meet this project's password requirements. Try a longer password with uppercase and lowercase letters, numbers, and a symbol.",
        "auth/requires-recent-login":
          "Please sign out, sign in again, and retry.",
        "auth/too-many-requests":
          "Too many attempts. Please wait before trying again.",
      };

      Alert.alert(
        "Unable to change password",
        messages[error.code] || errorMessage(error),
      );
    } finally {
      clearPasswords();
      working.current = false;
      setBusy(false);
    }
  }

  async function logout() {
    if (working.current) return;

    working.current = true;
    setBusy(true);

    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert("Sign out failed", errorMessage(error));
    } finally {
      working.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <Label
        bold
        style={{
          fontSize: 24,
          textAlign: "center",
          marginTop: 4,
        }}
      >
        Profile
      </Label>

      <View style={{ alignItems: "center", marginVertical: 24 }}>
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: "#607D8B",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="person" size={50} color="white" />
        </View>

        <Label
          bold
          style={{
            marginTop: 12,
            fontSize: 20,
            textAlign: "center",
          }}
        >
          {savedName || "Scan&Go Passenger"}
        </Label>

        <Label
          style={{
            marginTop: 6,
            color: "#777",
            textAlign: "center",
          }}
        >
          {user.email}
        </Label>
      </View>

      {mode === null && (
        <>
          <Button
            title="Edit Profile"
            disabled={busy}
            onPress={() => {
              setName(savedName);
              setMode("profile");
            }}
          />

          <Button
            title="Change Password"
            outline
            disabled={busy}
            onPress={() => {
              clearPasswords();
              setMode("password");
            }}
          />

          {onAdmin && (
            <Button
              title="Admin Dashboard"
              onPress={onAdmin}
              disabled={busy}
            />
          )}

          <Button
            title="Sign Out"
            outline
            color="#D32F2F"
            disabled={busy}
            onPress={() =>
              Alert.alert(
                "Sign Out",
                "Are you sure you want to sign out?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: logout,
                  },
                ],
              )
            }
          />
        </>
      )}

      {mode === "profile" && (
        <Card>
          <Label bold style={{ fontSize: 20, marginBottom: 16 }}>
            Edit Profile
          </Label>

          <Field
            label="Full Name"
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            maxLength={80}
            editable={!busy}
          />

          <Field
            label="Email Address"
            value={user.email || ""}
            editable={false}
            style={{ backgroundColor: "#F0F0F0" }}
          />

          <Label style={{ color: "#777", marginBottom: 12 }}>
            Your sign-in email is shown here for reference.
          </Label>

          <Button
            title="Save Profile"
            onPress={saveName}
            busy={busy}
          />

          <Button
            title="Cancel"
            outline
            disabled={busy}
            onPress={closeForm}
          />
        </Card>
      )}

      {mode === "password" && (
        <Card>
          <Label bold style={{ fontSize: 20, marginBottom: 16 }}>
            Change Password
          </Label>

          <Field
            label="Current Password"
            placeholder="Enter your current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            editable={!busy}
          />

          <Field
            label="New Password"
            placeholder="At least 6 characters"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            editable={!busy}
          />

          <Field
            label="Confirm New Password"
            placeholder="Enter your new password again"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            editable={!busy}
          />

          <Button
            title="Update Password"
            onPress={savePassword}
            busy={busy}
          />

          <Button
            title="Cancel"
            outline
            disabled={busy}
            onPress={closeForm}
          />
        </Card>
      )}

      <Notice>
        Scan&Go • Subject project. All payments are simulated.
        Travel is terminal-to-terminal only.
      </Notice>
    </>
  );
}

export default function PassengerScreen({ data, user, onAdmin }) {
  const [tab, setTab] = useState(0);
  const [history, setHistory] = useState(false);
  const [selected, setSelected] = useState(null);
  const [qr, setQR] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  const trip = data.schedules.find((s) => s.id === selected);

  const trips = data.schedules.filter(
    (s) =>
      s.status === "scheduled" &&
      s.departureTime.toMillis() > now,
  );

  const completed = (ticket) =>
    ["completed", "cancelled"].includes(
      data.schedules.find((s) => s.id === ticket.scheduleId)
        ?.status,
    );

  const visibleTickets = data.tickets.filter(
    (ticket) => completed(ticket) === history,
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: tab === 1 ? colors.grey : "white",
      }}
    >
      {tab === 0 && <Header title="Scan & Go" />}

      {tab === 2 ? (
        <Page>
          <ProfileDashboard
            key={user.uid}
            user={user}
            onAdmin={onAdmin}
          />
        </Page>
      ) : data.error ? (
        <Page>
          <Notice>{data.error}</Notice>
          <Button title="Retry" onPress={data.retry} />
        </Page>
      ) : data.loading ? (
        <ActivityIndicator
          style={{ flex: 1 }}
          color={colors.teal}
        />
      ) : (
        <Page>
          {tab === 0 && (
            <>
              <Label
                bold
                style={{
                  fontSize: 20,
                  textAlign: "center",
                  color: "black",
                  marginTop: 8,
                  marginBottom: 16,
                }}
              >
                Available Bus Trips
              </Label>

              {trips.length ? (
                trips.map((schedule, index) => (
                  <TripCard
                    key={schedule.id}
                    trip={schedule}
                    index={index}
                    now={now}
                    onBook={() => setSelected(schedule.id)}
                  />
                ))
              ) : (
                <Empty text="No routes available. Please check again later." />
              )}
            </>
          )}

          {tab === 1 && (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Label
                  bold
                  style={{ fontSize: 22, color: "black" }}
                >
                  Your Tickets
                </Label>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="View history"
                  onPress={() => setHistory(true)}
                >
                  <MaterialIcons name="history" size={26} />
                </Pressable>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: "#EEE",
                  borderRadius: 10,
                  marginVertical: 16,
                }}
              >
                {["Ongoing", "Completed"].map((title, index) => (
                  <Pressable
                    key={title}
                    onPress={() => setHistory(Boolean(index))}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderBottomWidth:
                        history === Boolean(index) ? 2 : 0,
                      borderColor: "#2196F3",
                    }}
                  >
                    <Label
                      style={{
                        textAlign: "center",
                        color:
                          history === Boolean(index)
                            ? "#2196F3"
                            : "#666",
                      }}
                    >
                      {title}
                    </Label>
                  </Pressable>
                ))}
              </View>

              {!visibleTickets.length && (
                <Empty text="No tickets found" />
              )}

              {visibleTickets.map((ticket) => (
                <Card key={ticket.id}>
                  <Label bold>
                    Ticket #{ticket.id.slice(0, 8)}
                  </Label>

                  <View
                    style={{
                      alignSelf: "flex-start",
                      borderRadius: 12,
                      backgroundColor: "#D1F2DB",
                      padding: 6,
                      marginVertical: 8,
                    }}
                  >
                    <Label
                      style={{
                        color: "#258641",
                        fontSize: 12,
                      }}
                    >
                      Demo Payment Successful
                    </Label>
                  </View>

                  <View
                    style={{
                      height: 1,
                      backgroundColor: "#DDD",
                      marginBottom: 8,
                    }}
                  />

                  <Label>
                    Route: {ticket.origin} → {ticket.destination}
                  </Label>

                  <Label>
                    Departure: {dateLabel(ticket.departureTime)}
                  </Label>

                  <Label>
                    Seat: {ticket.seatNumber} • {ticket.plateNumber}
                  </Label>

                  <Label>
                    Ticket Price: {money(ticket.fare)}
                  </Label>

                  <Label>
                    Aircon: {ticket.isAircon ? "Yes" : "No"}
                  </Label>

                  <Label>
                    Status:{" "}
                    {completed(ticket)
                      ? data.schedules.find(
                          (s) => s.id === ticket.scheduleId,
                        )?.status
                      : ticket.status.replace("_", " ")}
                  </Label>

                  <Button
                    title="View QR Ticket"
                    outline
                    onPress={() => setQR(ticket)}
                  />
                </Card>
              ))}
            </>
          )}
        </Page>
      )}

      <View
        style={{
          flexDirection: "row",
          height: 60,
          backgroundColor: "#F8F8F8",
          alignItems: "center",
          justifyContent: "space-around",
        }}
      >
        {["home", "confirmation-number", "person"].map(
          (icon, index) => (
            <Pressable
              key={icon}
              accessibilityRole="tab"
              accessibilityLabel={
                ["Home", "Tickets", "Profile"][index]
              }
              accessibilityState={{ selected: tab === index }}
              onPress={() => setTab(index)}
              style={{ padding: 16 }}
            >
              <MaterialIcons
                name={icon}
                size={26}
                color={tab === index ? "#607D8B" : "#757575"}
              />
            </Pressable>
          ),
        )}
      </View>

      {trip && (
        <BookingModal
          key={trip.id}
          trip={trip}
          onClose={() => setSelected(null)}
          onSuccess={() => {
            setSelected(null);
            setTab(1);
            setHistory(false);

            Alert.alert(
              "Booking successful",
              "Demo payment completed. Your QR ticket is in Your Tickets.",
            );
          }}
        />
      )}

      {qr && (
        <Modal
          animationType="slide"
          onRequestClose={() => setQR(null)}
        >
          <Header
            title="QR Ticket"
            back={() => setQR(null)}
          />

          <Page>
            <Card>
              <Label
                bold
                style={{ fontSize: 20, textAlign: "center" }}
              >
                Scan&Go
              </Label>

              <Label
                style={{
                  textAlign: "center",
                  marginVertical: 16,
                }}
              >
                {qr.origin} → {qr.destination}
              </Label>

              <View
                style={{
                  alignItems: "center",
                  padding: 20,
                }}
              >
                <QRCode
                  size={220}
                  value={JSON.stringify({
                    app: "scanandgo",
                    v: 1,
                    ticketId: qr.id,
                  })}
                />
              </View>

              <Label>
                Seat {qr.seatNumber} • {qr.plateNumber}
              </Label>

              <Label>{dateLabel(qr.departureTime)}</Label>

              <Label>{money(qr.fare)} • Demo payment</Label>

              <Label
                selectable
                style={{ fontSize: 11, marginTop: 10 }}
              >
                Ticket ID: {qr.id}
              </Label>

              <Notice>
                Present at your departure terminal. The admin
                verifies the reservation online. A QR code can
                be checked in only once.
              </Notice>
            </Card>

            <Button
              title="Close"
              onPress={() => setQR(null)}
            />
          </Page>
        </Modal>
      )}
    </View>
  );
}