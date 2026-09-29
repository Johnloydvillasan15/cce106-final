import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
} from "@expo-google-fonts/poppins";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, isConfigured } from "./firebaseConfig";
import AuthScreen from "./src/screens/AuthScreen";
import PassengerScreen from "./src/screens/PassengerScreen";
import AdminScreen from "./src/screens/AdminScreen";
import { useLiveData } from "./src/services/useLiveData";
import { Button, Page, Label, Notice } from "./src/components/UI";
import { errorMessage } from "./src/utils/format";
function SignedIn({ user, role }) {
  const admin = role === "admin";
  const [passenger, setPassenger] = useState(false);
  const data = useLiveData(user.uid, admin);
  return admin && !passenger ? (
    <AdminScreen data={data} onPassenger={() => setPassenger(true)} />
  ) : (
    <PassengerScreen
      data={data}
      user={user}
      onAdmin={admin ? () => setPassenger(false) : undefined}
    />
  );
}
export default function App() {
  const [fonts, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
  });
  const [user, setUser] = useState(null),
    [role, setRole] = useState(null),
    [loading, setLoading] = useState(isConfigured),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!isConfigured) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setRole(null);
      setError("");
      setLoading(!!u);
    });
  }, []);
  useEffect(() => {
    if (!user) return;
    let active = true,
      unsub = () => {};
    const ref = doc(db, "users", user.uid);
    setLoading(true);
    setError("");
    // Recover an account created before its profile write completed.
    runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists())
        tx.set(ref, {
          email: user.email,
          role: "user",
          createdAt: serverTimestamp(),
        });
    })
      .then(() => {
        if (!active) return;
        unsub = onSnapshot(
          ref,
          (snap) => {
            if (!active) return;
            if (!snap.exists()) {
              setError("Account profile missing. Retry to restore it.");
            } else setRole(snap.data().role);
            setLoading(false);
          },
          (e) => {
            setError(errorMessage(e));
            setLoading(false);
          },
        );
      })
      .catch((e) => {
        if (active) {
          setError(errorMessage(e));
          setLoading(false);
        }
      });
    return () => {
      active = false;
      unsub();
    };
  }, [user, retry]);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "white" }}>
        <StatusBar style="dark" />
        {(!fonts && !fontError) || loading ? (
          <ActivityIndicator style={{ flex: 1 }} />
        ) : error ? (
          <Page>
            <Label bold>Account setup could not finish</Label>
            <Notice>{error}</Notice>
            <Button title="Retry" onPress={() => setRetry((n) => n + 1)} />
            <Button
              title="Sign Out"
              onPress={() =>
                signOut(auth).catch((e) =>
                  Alert.alert("Error", errorMessage(e)),
                )
              }
            />
          </Page>
        ) : user && role ? (
          <SignedIn key={`${user.uid}-${role}`} user={user} role={role} />
        ) : (
          <AuthScreen />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
