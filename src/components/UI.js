import React from "react";
import {
  Text,
  View,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "../theme";
export function Label({ children, style, bold, ...props }) {
  return (
    <Text
      {...props}
      style={[
        {
          color: colors.text,
          fontFamily: bold ? "Poppins_600SemiBold" : "Poppins_400Regular",
          fontSize: 14,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Button({
  title,
  onPress,
  disabled,
  busy,
  color = colors.teal,
  outline = false,
  style,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: outline ? "transparent" : color,
          borderColor: color,
          borderWidth: outline ? 1 : 0,
          opacity: disabled || busy ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={outline ? color : "white"} />
      ) : (
        <Label
          bold
          style={{ color: outline ? color : "white", textAlign: "center" }}
        >
          {title}
        </Label>
      )}
    </Pressable>
  );
}
export function Field({ label, style, ...props }) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label && <Label style={{ marginBottom: 6 }}>{label}</Label>}
      <TextInput
        accessibilityLabel={label || props.placeholder}
        placeholderTextColor="#888"
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}
export function Header({ title, back, color = colors.navy, right }) {
  return (
    <View style={[styles.header, { backgroundColor: color }]}>
      <View style={{ width: 44 }}>
        {back && (
          <Pressable accessibilityLabel="Go back" onPress={back}>
            <MaterialIcons name="arrow-back" size={25} color="white" />
          </Pressable>
        )}
      </View>
      <Label
        bold
        style={{ color: "white", fontSize: 18, flex: 1, textAlign: "center" }}
      >
        {title}
      </Label>
      <View style={{ width: 44 }}>{right}</View>
    </View>
  );
}
export function Page({ children, style, contentStyle }) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          { padding: 16, paddingBottom: 32, flexGrow: 1 },
          contentStyle,
        ]}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Info({ icon, children }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 3,
        gap: 8,
      }}
    >
      <MaterialIcons name={icon} size={18} color="#B0BEC5" />
      <Label style={{ flex: 1 }}>{children}</Label>
    </View>
  );
}
export function Empty({ text = "No trips available." }) {
  return (
    <View style={{ padding: 32, alignItems: "center" }}>
      <Label style={{ textAlign: "center" }}>{text}</Label>
    </View>
  );
}
export function Notice({ children }) {
  return (
    <View
      style={{
        backgroundColor: "#FFF3D7",
        padding: 12,
        borderRadius: 8,
        marginVertical: 10,
      }}
    >
      <Label style={{ fontSize: 12, color: "#745400" }}>{children}</Label>
    </View>
  );
}
export const styles = StyleSheet.create({
  button: {
    padding: 14,
    borderRadius: 12,
    justifyContent: "center",
    minHeight: 48,
    marginVertical: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#BCC5CA",
    borderRadius: 5,
    padding: 15,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    backgroundColor: "white",
    color: "#222",
  },
  header: {
    height: 58,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
