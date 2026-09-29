import { milliseconds } from "./domain";

export const money = (value) =>
  `₱${Number(value).toFixed(2)}`;

export const dateLabel = (value) =>
  new Date(milliseconds(value)).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

export function errorMessage(error) {
  const messages = {
    "auth/invalid-credential":
      "Incorrect email or password.",

    "auth/invalid-email":
      "Enter a valid email address.",

    "auth/email-already-in-use":
      "This email already has an account. Please log in.",

    "auth/weak-password":
      "Use a password with at least 6 characters.",

    "auth/network-request-failed":
      "Check your internet connection and try again.",

    "auth/too-many-requests":
      "Too many attempts. Please try again later.",

    "permission-denied":
      "Access denied. Check your account role and deployed Firestore rules.",

    unavailable:
      "The service is unavailable. Check your connection and retry.",
  };

  return (
    messages[error.code] ||
    error.message ||
    "Something went wrong. Please try again."
  );
}