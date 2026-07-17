# CyberiaSocial

> *"The Wired is not a game. You are not in the real world right now."*

A real-time social network inspired by Serial Experiments Lain. Electric cobalt blue on near-black. Present or not.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | [Convex](https://convex.dev) — real-time DB + serverless functions |
| Auth | Phone OTP via [Twilio Verify](https://twilio.com/verify) |
| App | [Expo](https://expo.dev) (iOS + Android + Web) |
| OTA Updates | [EAS Update](https://docs.expo.dev/eas-update/introduction/) |
| CI/CD | GitHub Actions |

---

## Project Structure

```
cyberia-social/
├── apps/
│   └── mobile/       ← Expo app (iOS, Android, Web)
├── convex/           ← Backend: schema, functions, crons
└── .github/
    └── workflows/    ← CI/CD pipelines
```

---

## Getting Started

### 1. Set up Convex

```bash
npx convex dev
```

This creates a Convex project, generates types, and starts the local backend.

### 2. Start the app

```bash
npm run dev
```

- Press `w` for web
- Press `a` for Android
- Press `i` for iOS
- Scan the QR code with [Expo Go](https://expo.dev/go)

### 3. Twilio (phone auth)

Create a [Twilio Verify](https://twilio.com/verify) service and add to Convex environment variables:
```
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_VERIFY_SID=VAxxxx
```

Then uncomment the Twilio call in `convex/auth.ts`.

---

## Design Philosophy

- **No history on join** — you are either present or you're not
- **24h TTL on room messages** — conversations dissolve like signals
- **DMs persist** — private channels are permanent
- **One private room per user** — your permanent node in the Wired
- **Phone auth** — one identity, no throwaway accounts

---

## CI/CD

### OTA Updates (JS changes)
Push to `main` → GitHub Action → `eas update` → users get it on next app open. No store review.

### Native Builds (new native modules)
Push a version tag `v1.x.x` or trigger manually → `eas build` → submit to App Store / Play Store.

### Required GitHub Secrets
```
CONVEX_DEPLOY_KEY     ← from Convex dashboard
EXPO_TOKEN            ← from expo.dev account settings
```

---

## Features

- ✅ Phone OTP auth
- ✅ Public rooms — ephemeral, no history on join
- ✅ Private rooms — one per user, permanent address, always open
- ✅ Direct messages — persistent, full history
- ✅ Real-time presence — see who's in a room right now
- ✅ @mention notifications
- ✅ 24h message TTL with scheduled cleanup
- ✅ Push notifications (Expo)
- ✅ OTA updates via EAS
- ✅ Cyberia blue aesthetic — glassmorphism, dark theme

---

*"No matter where you go, everyone is connected."*
