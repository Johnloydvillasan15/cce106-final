import React, { useState } from "react";
import { Image, View, useWindowDimensions, Alert } from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { auth, isConfigured } from "../../firebaseConfig";
import { Button, Field, Label, Page, Notice } from "../components/UI";
import { errorMessage } from "../utils/format";
export default function AuthScreen() {
  const [signup, setSignup] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false);
  const { width, height } = useWindowDimensions();
  async function submit() {
    if (!isConfigured)
      return Alert.alert(
        "Firebase setup needed",
        "Follow README.md and fill in your .env file, then restart Expo.",
      );
    if (!email.trim() || !password)
      return Alert.alert("Missing details", "Enter your email and password.");
    if (signup && password !== confirm)
      return Alert.alert(
        "Passwords do not match",
        "Please check both password fields.",
      );
    setBusy(true);
    try {
      if (signup)
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      Alert.alert("Unable to continue", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    if (!isConfigured)
      return Alert.alert("Firebase setup needed", "Configure .env first.");
    if (!email.trim())
      return Alert.alert(
        "Enter your email",
        "Enter your email in the Gmail field first.",
      );
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert(
        "Check your inbox",
        "If this address has an account, a reset email will be sent.",
      );
    } catch (e) {
      Alert.alert("Reset failed", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Page
      style={{ backgroundColor: "#E0E0E0" }}
      contentStyle={{
        paddingHorizontal: width * 0.05,
        paddingTop: height * 0.2,
      }}
    >
      <Image
        source={require("../../assets/Davo.png")}
        style={{
          width: width * 0.5,
          height: width * 0.22,
          alignSelf: "center",
        }}
        resizeMode="contain"
      />
      <Label
        style={{
          textAlign: "center",
          fontSize: width * 0.05,
          color: "#616161",
          marginTop: height * 0.05,
          marginBottom: height * 0.03,
        }}
      >
        Your Partner in Safe and Convenient Travel.
      </Label>
      {!isConfigured && (
        <Notice>
          Firebase setup required. See README.md to connect authentication and
          live bookings.
        </Notice>
      )}
      <View style={{ marginHorizontal: 25 }}>
        <Field
          placeholder="Gmail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          style={{ backgroundColor: "#EEE", borderColor: "white" }}
        />
        <Field
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          style={{ backgroundColor: "#EEE", borderColor: "white" }}
        />
        {signup && (
          <Field
            placeholder="Confirm Password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoCapitalize="none"
            style={{ backgroundColor: "#EEE", borderColor: "white" }}
          />
        )}
      </View>
      {!signup && (
        <Button
          title="Forgot Password?"
          onPress={reset}
          disabled={busy}
          outline
          color="#616161"
          style={{ alignSelf: "flex-end", borderWidth: 0, padding: 0 }}
        />
      )}
      <Button
        title={signup ? "Sign Up" : "Log In"}
        onPress={submit}
        busy={busy}
        color="black"
        style={{
          marginHorizontal: 25,
          padding: 25,
          borderRadius: 8,
          marginTop: 20,
        }}
      />
      <View style={{ marginTop: 28 }}>
        <Label style={{ textAlign: "center" }}>
          {signup ? "Already have an account?" : "Not a member?"}
        </Label>
        <Button
          title={signup ? "Log In" : "Sign Up"}
          onPress={() => {
            setSignup(!signup);
            setPassword("");
            setConfirm("");
          }}
          disabled={busy}
          outline
          color="#2196F3"
          style={{ borderWidth: 0 }}
        />
      </View>
    </Page>
  );
}
