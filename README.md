# Scan&Go — React Native / Expo 51 / JavaScript

Converted from the supplied Flutter `paw-patrol-ticketing-main` project. Android is the target. All authored app and test code is JavaScript, with no TypeScript application files.

## Start here

1. Extract the ZIP and open the `ScanAndGoRN` folder in VS Code.
2. Install Node.js 22 and run `npm ci` inside that folder.
3. Copy `.env.example` to `.env`. On Windows PowerShell: `Copy-Item .env.example .env`.
4. Complete Firebase setup below, then run `npx expo start --clear`.
5. Open with an **Expo Go build compatible with SDK 51** on Android, or an SDK 51 development build. A current Expo Go build may reject SDK 51. Matching Android build: https://expo.dev/go?sdkVersion=51&platform=android&device=true . For an Android emulator, press `a` in the Expo terminal.

There are no bundled credentials. The login screen shows a setup notice until `.env` is filled in. Run commands from the project folder containing `package.json`.

## Firebase setup

Use a separate Firebase project for this subject version so its new schema/rules do not interfere with your Flutter capstone database.

1. Create/select the subject project in Firebase Console.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create a **Cloud Firestore** database.
4. Under **Project settings → Your apps**, register a **Web app**. Copy its configuration values into `.env`. Expo's Firebase JavaScript SDK uses Web app values even on Android. Do not use a service-account JSON or private key. Flutter's `google-services.json` is not needed.
5. Paste the complete `firestore.rules` file into **Firestore Database → Rules** and publish. Alternatively:

   ```sh
   npx firebase login
   npx firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
   ```

6. Restart Expo using `npx expo start --clear` after changing `.env`.
7. Tap **Sign Up**. The app creates an Auth account and a `users/{uid}` profile with `role: "user"`, then opens the passenger view.

### Make your admin account

Sign up normally first. In Firebase Console → Firestore → `users` → your UID, change `role` from `user` to `admin`. The app observes this change and opens Admin Dashboard. The app cannot promote accounts. There is no hard-coded admin password or unrestricted admin demo button.

### Add the first trip

Choose **Add Bus Route** and enter designated Davao Region start/end terminals, plate number, departure date/time, seats (1–60), fare and air-conditioning. Departure must be more than ten minutes in the future. Route and dated schedule are combined in one record, matching the original Flutter model. Create another record for another departure on the same route. Add your actual subject demonstration terminal names and fares; nothing is silently seeded into Firebase.

## Demo walkthrough

1. Admin creates a future terminal-to-terminal trip.
2. Passenger logs in, taps **Book Ticket**, selects a seat and confirms it.
3. Passenger reviews **DEMO PAYMENT ONLY** and taps **Simulate Payment**. The payment QR is illustrative and cannot charge a bank or wallet.
4. A Firestore transaction reserves the seat and creates a `demo_paid` ticket. Seat selection alone does not reserve it. A competing passenger can win before confirmation; the losing transaction displays an error.
5. Passenger opens **Tickets → View QR Ticket**.
6. Admin chooses **Scan QR Code**, selects the intended bus trip, permits camera access and scans the QR. Manual ticket-ID entry is also available. Online verification rejects a wrong-trip ticket or an already-used ticket.
7. After arrival, admin marks the trip completed. Its tickets move to Completed. Cancelled trips also appear there, marked cancelled.

Booking closes ten minutes before departure, matching the active Flutter booking screen. No real payments, GPS tracking, intermediate stops, sub-terminal drop-offs or payment gateway are included.

## UI mapping

The active Flutter home is `lib/pages/Testing.dart`, selected by `lib/base/botton,nav.dart`. The older `home_screen.dart` is commented out, so it is not the visual baseline.

| Flutter reference                              | React Native file                              | Preserved design                                                                            |
| ---------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `pages/login_page.dart`, `pages/register.dart` | `src/screens/AuthScreen.js`                    | Original Davo image, grey background, filled fields, black auth button, blue auth switch    |
| `pages/Testing.dart`                           | `PassengerScreen.js`, `components/TripCard.js` | Navy #1A3A66 header, white rounded trip cards, teal #189999 buttons, Poppins                |
| Seat dialog in `Testing.dart`                  | `BookingModal.js`                              | Four seats per row, center aisle, white available seats, orange taken seats, teal selection |
| `screens/tickets/ticket_screen.dart`           | `PassengerScreen.js`                           | Your Tickets, Ongoing/Completed tabs, grey background, white tickets                        |
| `screens/person/profile_screen.dart`           | `PassengerScreen.js`                           | Circular avatar, email and red sign-out                                                     |
| `Admin/pages/AdminHomeScreen.dart`             | `AdminScreen.js`                               | Light blue background, blue header, two-column colored dashboard tiles                      |
| `Admin/pages/AddBusRouteScreen.dart`           | `ScheduleForm.js`                              | Terminals, plate, date/time, seats, fare and aircon                                         |
| `Admin/pages/ManageBusRoutesScreen.dart`       | `AdminScreen.js`                               | Route cards, edit, bookings, completion and deletion                                        |
| `Admin/pages/ScanQRScreen.dart`                | `ScannerScreen.js`                             | Original placeholder completed with camera scanning and verification                        |

All original `lib/images` assets are included. Login/sign-up labels explicitly match your request. Native typography, date pickers, accessibility sizing and added functional controls can differ from Flutter. Pixel-for-pixel parity has not been verified on a physical Android device. The source archive has unresolved Git merge conflicts in ManageBusRoutesScreen and unfinished flows, so those cannot provide a runnable exact baseline.

## Database and security

- `users/{uid}`: email, role, createdAt. Owners can read their profile and create only a passenger profile. Administrators are promoted outside the app.
- `schedules/{scheduleId}`: origin, destination, departureTime (Timestamp), plateNumber, totalSeats, fare (PHP), isAircon, status, seats (seat number → ticket ID), lastTicketId, createdAt.
- `tickets/{ticketId}`: userId, email, scheduleId, seatNumber, immutable trip/fare snapshot, paymentStatus `demo_paid`, status `booked` / `checked_in`, createdAt, optional checkedInAt.

Schedules expose seat occupancy and opaque ticket IDs, not passenger emails. Passengers query only their own tickets; admins can monitor all. Rules validate the ticket and seat change together using `getAfter()`, including fare, terminal pair, departure, seat bounds and ownership. A seat cannot be reserved without a matching ticket and a ticket cannot be created without its reservation. Creation/check-in use server timestamps. The payment reference is reused after an uncertain network result to prevent duplicate confirmation.

Booked trip details are locked to protect issued tickets. Admins can cancel or complete trips; only unbooked trips can be deleted. Cancellation closes the entire trip and preserves history. There is no real payment/refund.

**Existing Flutter Firestore data is not automatically migrated.** This port uses the new schema above. The old Firebase and PayMongo configuration is not reused. Server-side database contents were not included in the ZIP.

## Verification

```sh
npm test
npm run test:rules
npx expo install --check
npx expo export --platform android
```

Rules tests need Java (use Java 21) and download the Firestore emulator on first run. They use the isolated `demo-scanandgo` project and do not modify your Firebase project. Expected permission-denied logs are tests deliberately attempting forbidden operations.

At delivery, pure-JavaScript domain tests, Firestore emulator security tests, Expo dependency compatibility checks and Android JavaScript/Hermes export passed. Tests cover competing reservations, forged fares, self-promotion, private ticket access and repeated check-in.

An export is not an APK or a physical-device test. Live Firebase configuration, camera behavior and the full phone walkthrough still need verification on your Android device. No live rules were deployed on your behalf.

## Code layout

- `App.js`: fonts, auth session, profile recovery and role entry.
- `firebaseConfig.js`: environment values, persistent native Auth and Firestore.
- `src/screens/`: auth, passenger, payment/seat modal, admin, schedule form and scanner.
- `src/services/`: live listeners, atomic bookings and admin operations.
- `src/components/`: shared controls and matching trip cards.
- `src/utils/`: validation and formatting.
- `firestore.rules`: deployable access and booking rules.
- `tests/`: domain and Firestore emulator tests.

## Reference documentation

- https://docs.expo.dev/versions/v51.0.0/
- https://docs.expo.dev/versions/v51.0.0/sdk/camera/
- https://firebase.google.com/docs/firestore/manage-data/transactions
- https://firebase.google.com/docs/firestore/security/rules-conditions
