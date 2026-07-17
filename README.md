# CyberiaSocial

> *"Present or not."*

Real-time ephemeral chat. Rooms and DMs dissolve after 24 hours. No history — just the moment.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | [Convex](https://convex.dev) — real-time DB + serverless functions |
| App | [Expo](https://expo.dev) (iOS + Android + Web) |
| OTA Updates | [EAS Update](https://docs.expo.dev/eas-update/introduction/) |
| CI/CD | GitHub Actions |

---

## Project Structure

```
cyberia-social/
├── App.js                 # Root component + navigation
├── index.js               # Expo entry point
├── app.json               # Expo config
├── package.json           # Dependencies
├── src/
│   ├── screens/           # 10 screens (Auth, Rooms, DMs, Profile, etc.)
│   ├── components/        # Shared UI (Header, ChatInput, MessageBubble, etc.)
│   ├── lib/               # theme, sharedStyles, storage
│   └── context/           # AuthContext
├── convex/                # Backend — schema, mutations, queries, crons
│   ├── schema.ts          # Data model
│   ├── auth.ts            # Phone OTP auth
│   ├── rooms.ts           # Room management + join/leave presence
│   ├── messages.ts        # Room messages (24h TTL)
│   ├── dms.ts             # Direct messages (24h TTL)
│   ├── users.ts           # User profiles
│   ├── notifications.ts   # Push/in-app notifications
│   ├── presence.ts        # Stale presence cleanup
│   └── crons.ts           # Scheduled jobs
├── assets/                # App icons
└── .github/workflows/     # CI/CD (EAS build + update)
```

---

## Getting Started

### 1. Install

```bash
npm install
```

### 2. Set up Convex

```bash
npx convex dev
```

Creates a Convex project, generates `convex/_generated/`, and starts the local backend.

### 3. Start the app

```bash
npm run dev
```

- `w` — web
- `a` — Android
- `i` — iOS
- Scan QR with [Expo Go](https://expo.dev/go)

---

## Design

- **24h TTL on everything** — rooms and DMs dissolve after 24 hours
- **No history on join** — you see only what happens while you're present
- **One private room per user** — your permanent node
- **Real-time presence** — see who's here, join/leave notifications
- **Phone auth** — one identity, no throwaway accounts

---

## CI/CD

Push to `main` → `eas update` (OTA JS updates, no store review)
Push version tag → `eas build` (native binaries for App Store / Play Store)

### Required GitHub Secrets

```
CONVEX_DEPLOY_KEY     ← Convex dashboard
EXPO_TOKEN            ← expo.dev account settings
```
