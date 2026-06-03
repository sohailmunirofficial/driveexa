# Driveexa Project Guide

## Project Overview

Driveexa is a car rental management application built with Expo and React Native. It is designed for managing a local rental workflow from a mobile app, including vehicles, customers, bookings, payments, reports, and admin profile settings.

The app uses a local SQLite database on the device. This means the app can store and read operational data without a remote database server. Data is local to the installed app instance unless the app is extended with a backend or sync system.

## Technology Stack

- **Framework:** Expo with React Native
- **Routing:** Expo Router
- **Language:** TypeScript
- **Database:** Expo SQLite
- **Authentication storage:** Expo SecureStore on native platforms
- **Password hashing:** Custom password hashing using Expo Crypto and `@noble/hashes`
- **UI:** React Native components, Expo Linear Gradient, Expo Image, Bottom Sheet modals, Lucide icons
- **Date/time input:** `@react-native-community/datetimepicker`
- **Image selection:** Expo Image Picker
- **Email sending:** Nodemailer through an Expo Router API route
- **Theme support:** System, light, and dark modes with persisted theme preference

## App Purpose

The application helps an admin manage:

- Vehicle fleet records
- Customer records and documents
- Rental bookings
- Booking payments and balances
- Security deposits
- Reports and rental performance
- Admin profile and theme preferences
- Password reset using email OTP

## Main App Screens

### Authentication

Auth screens are located in `app/auth`.

- `login.tsx`: signs in an existing admin.
- `signup.tsx`: creates the admin account.
- `forgot-password.tsx`: requests a password reset OTP.
- `reset-password.tsx`: verifies OTP and updates the password.

The app currently allows only one admin account. During signup, if a user already exists, the app blocks creating another admin account.

### Startup Flow

The app starts from `app/index.tsx`.

That file does not show a landing page. It redirects based on auth state:

- Logged-in user goes to `/home`.
- Logged-out user goes to `/auth/login`.

The root layout in `app/_layout.tsx` initializes the theme provider, auth provider, splash screen handling, safe area provider, gesture handler root, and bottom sheet provider.

### Home Dashboard

Located at `app/(tabs)/home.tsx`.

The home screen shows:

- Dashboard summary cards
- Quick actions
- Recent bookings
- Available cars
- Logged-in user avatar or initials

### Cars

Main route: `app/(tabs)/cars.tsx`

Related routes:

- `app/cars/[id].tsx`: vehicle details
- `app/owner/add-vehicle.tsx`: add vehicle
- `app/owner/edit-vehicle.tsx`: edit vehicle
- `components/vehicle-form.tsx`: reusable vehicle form logic/UI

Cars support:

- Name
- Type
- Registration number
- Model year
- Color
- Daily and hourly price
- Multiple vehicle images
- Transmission
- Seats
- Fuel type
- Description
- Availability state

### Bookings

Main route: `app/(tabs)/bookings.tsx`

Related routes:

- `app/booking/create.tsx`: create booking
- `app/booking/[id].tsx`: booking details
- `app/booking/edit/[id].tsx`: edit booking

Bookings support:

- Customer selection
- Vehicle selection
- Day or hour pricing
- Start and end date/time
- Discount amount and discount reason
- Advance payment
- Balance calculation
- Security deposit
- Notes
- Payment status
- Booking status

Booking calculations are handled through `services/booking-pricing.ts`, which keeps price logic centralized.

### Customers

Main route: `app/(tabs)/customers.tsx`

Related routes:

- `app/customer/create.tsx`: add customer
- `app/customer/[id].tsx`: edit customer
- `components/customer-details-form.tsx`: reusable customer form

Customers support:

- Full name
- Phone number
- CNIC number
- Driving license front image
- Driving license back image
- CNIC front image
- CNIC back image

### Reports

Located at `app/(tabs)/reports.tsx`.

Reports show rental and earning information using local booking data. Filtering is available for report views.

### Profile

Located at `app/(tabs)/profile.tsx`.

The profile screen supports:

- Updating name
- Updating email after current password verification
- Updating phone number
- Changing password through a bottom sheet
- Changing theme mode between system, light, and dark
- Logging out

## Codebase Structure

### `app/`

Contains all Expo Router routes. File and folder names map directly to app routes.

Examples:

- `app/auth/login.tsx` maps to `/auth/login`
- `app/(tabs)/home.tsx` maps to the Home tab
- `app/booking/[id].tsx` maps to a dynamic booking details page

### `components/`

Contains reusable UI and form components.

Important files:

- `components/vehicle-form.tsx`
- `components/customer-details-form.tsx`
- `components/image-picker.tsx`
- `components/ui/theme.ts`
- `components/ui/primitives.tsx`
- `components/ui/action-sheet.tsx`
- `components/ui/user-avatar.tsx`

### `context/`

Contains shared React context.

- `context/auth.tsx`: manages auth state, signin, signup, signout, startup auth check, and session refresh.

### `services/`

Contains app logic and data access code.

Important files:

- `db.ts`: SQLite database initialization, migrations, and seed data.
- `user-repository.ts`: admin user CRUD and password verification.
- `vehicle-repository.ts`: vehicle CRUD.
- `customer-repository.ts`: customer CRUD and duplicate checks.
- `booking-repository.ts`: booking CRUD, availability checks, status updates, and payment updates.
- `booking-pricing.ts`: shared pricing calculation logic.
- `auth-security.ts`: password hashing and verification.
- `auth-session.ts`: secure auth session storage.
- `password-reset-repository.ts`: OTP creation, verification, expiry, and cleanup.
- `password-reset-service.ts`: password reset workflow.
- `theme-preference.ts`: stores selected theme mode.
- `validation.ts`: email, password, OTP, and required-field validation.

## Database Design

The local SQLite database is opened as `drivexa.db` in `services/db.ts`.

Main tables:

- `users`: admin account data.
- `password_reset_otps`: hashed OTP records for password reset.
- `customers`: customer information and document image URIs.
- `vehicles`: vehicle fleet records and image URIs.
- `bookings`: booking records, payment amounts, discounts, status, and date/time.
- `settings`: simple key/value settings.

The app enables SQLite WAL mode and foreign keys during initialization.

## Authentication and Security

The app has local admin authentication.

Security-related behavior:

- Passwords are not stored as plain text.
- Passwords are hashed before storage.
- Native platforms use SecureStore for the password pepper and session user id when SecureStore is available.
- Session state is restored on startup by reading the stored user id and loading the user from SQLite.
- Email is normalized before auth checks.
- Signup validates name, email, and password.
- Login validates email and password before verifying credentials.
- Email update requires current password verification.
- Password change requires current password, new password, and confirmation.

Password reset behavior:

- User enters admin email.
- App creates a 6-digit OTP.
- OTP is stored as a hash, not plain text.
- OTP expires after 10 minutes.
- OTP verification is limited by attempt count.
- OTP is deleted after successful password reset.
- OTP email is sent through the API route at `app/api/password-reset/send-otp+api.ts`.

SMTP values are configured through environment variables. `.env.example` contains placeholder names for the required SMTP setup.

## Booking Pricing Logic

Booking pricing is centralized in `services/booking-pricing.ts`.

The calculation uses:

- Base unit price
- Pricing unit: day or hour
- Rental quantity
- Discount amount
- Advance amount

The summary returns:

- Unit price
- Gross amount
- Discount amount
- Total price
- Advance amount
- Balance amount
- Payment status

Payment status is derived automatically:

- `paid` when advance covers total price
- `partial` when some advance is paid
- `pending` when no payment is recorded

## Vehicle Availability Logic

Bookings check vehicle availability before saving active bookings.

Availability checks use overlapping date logic:

- Existing booking start date must be before or equal to requested end date.
- Existing booking end date must be after or equal to requested start date.
- Cancelled and completed bookings do not block future active bookings.

When bookings are created, completed, cancelled, or moved to another vehicle, vehicle availability is synchronized.

## Image Handling

The app uses Expo Image Picker for selecting images.

Images are stored as URI strings in SQLite fields. The current project does not upload images to cloud storage. This means image availability depends on the URI remaining accessible on the device or from its original remote source.

Vehicle records support multiple image URIs through a JSON-serialized image list.

Customer records support front and back document image fields for license and CNIC.

## Theme System

The project has a custom theme system in `components/ui/theme.ts`.

It supports:

- Light mode
- Dark mode
- System mode

Theme selection is persisted through `services/theme-preference.ts`.

On native platforms, theme preference is stored with SecureStore when available. On web, it uses local storage when available.

## Cross-Platform Information

The app is configured for:

- Android
- iOS
- Web

Mobile support is the primary target. The Expo config includes Android package information, iOS bundle information, splash screen configuration, app icons, image picker permissions, SQLite, SecureStore, and typed Expo Router routes.

Important platform notes:

- SQLite storage is local per installed app instance.
- SecureStore is used on native platforms when available.
- Web uses fallback behavior for some storage features.
- Password reset email requires a reachable API base URL and SMTP environment variables.
- iOS and Android use native date/time picker behavior.

## Environment Variables

The project uses SMTP environment variables for password reset email.

Expected variables from `.env.example`:

- `SMTP_SERVICE`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `FROM_NAME`
- `FROM_EMAIL`

The password reset service can also use `EXPO_PUBLIC_API_BASE_URL` when the API route needs to be reached from a native app build.

Do not commit real `.env` values.

## How to Run the Project

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npm run start
```

Run on Android with Expo Go:

```bash
npm run android
```

Run on iOS with Expo Go:

```bash
npm run ios
```

Run web:

```bash
npm run web
```

Run lint:

```bash
npm run lint
```

Run TypeScript check:

```bash
npx tsc --noEmit
```

Export Android bundle:

```bash
npx expo export --platform android --output-dir /tmp/driveexa-export-android
```

Export iOS bundle:

```bash
npx expo export --platform ios --output-dir /tmp/driveexa-export-ios
```

## Important Limitations

- The database is local SQLite, not a cloud database.
- There is no built-in multi-device synchronization.
- The current app is structured around one admin account.
- Password reset email depends on SMTP configuration and a reachable API route.
- Image values are stored as URIs, not uploaded to cloud storage by this project.
- Reports are calculated from local booking records.

## Key Explanation Points

- Expo Router handles navigation through the `app/` directory.
- SQLite stores all business records locally.
- Repositories in `services/` are the main data access layer.
- Auth state is managed through `context/auth.tsx`.
- Password and OTP security logic is separated into service files.
- Booking pricing has a single source of truth in `services/booking-pricing.ts`.
- The UI is split between route screens and reusable components.
- Light and dark mode are controlled by a shared theme provider.
- The app is cross-platform through Expo and React Native, with mobile as the main target.
