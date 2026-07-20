<picture>
  <source media="(prefers-color-scheme: dark)" width="64" srcset="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect x='0' y='0' width='40' height='40' rx='10' fill='%23E8A840'/%3E%3Crect x='24' y='24' width='40' height='40' rx='10' fill='%23F0C060' opacity='0.7'/%3E%3C/svg%3E">
  <img width="64" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect x='0' y='0' width='40' height='40' rx='10' fill='%23E8A840'/%3E%3Crect x='24' y='24' width='40' height='40' rx='10' fill='%23F0C060' opacity='0.7'/%3E%3C/svg%3E" alt="Cyberia Space">
</picture>

# Cyberia Space

> *Real-time ephemeral chat. Rooms dissolve when you leave, DMs after 24h.*

---

## Stack

| Layer | Tech |
|---|---|
| Backend | [Convex](https://convex.dev) — real-time DB + serverless functions |
| App | [Expo](https://expo.dev) (iOS + Android + Web) |
| OTA Updates | [EAS Update](https://docs.expo.dev/eas-update/introduction/) |
| Auth | Phone OTP via Twilio |
| CI/CD | GitHub Actions |

---

## Project Structure

```
cyberia-space/
├── App.js                 # Root component + navigation
├── app.json               # Expo config
├── src/
│   ├── screens/           # Boot, Auth, Room, DMs, Profile, etc.
│   ├── components/        # Shared UI primitives
│   ├── lib/               # theme, storage, utilities
│   └── context/           # AuthContext
├── convex/                # Convex backend
│   ├── schema.ts          # Data model
│   ├── auth.ts            # Phone OTP + guest auth
│   ├── rooms.ts           # Room lifecycle, join/leave, presence
│   ├── messages.ts        # Room messages (24h TTL)
│   ├── dms.ts             # Direct messages (24h TTL)
│   ├── users.ts           # User profiles
│   ├── notifications.ts   # Push/in-app notifications
│   └── crons.ts           # Scheduled jobs
└── assets/
```

---

## Getting Started

```bash
npm install
npx convex dev
npm run dev
```

- `w` — web, `a` — Android, `i` — iOS
- Scan QR with [Expo Go](https://expo.dev/go)

---

## Design

- **24h TTL on everything** — rooms and DMs dissolve after 24 hours
- **Guest-first join** — enter via invite link, no account required
- **Phone auth** — upgrade from guest to permanent identity
- **Real-time presence** — see who's in the room, join/leave events
- **Kick detection** — removed from room → kicked screen

---

## CI/CD

Push to `main` → `eas update`
Push version tag → `eas build`

### Required secrets

```
CONVEX_DEPLOY_KEY
EXPO_TOKEN
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_SERVICE_SID
```

---

<p align="center"><sub>cyberia space</sub></p>
