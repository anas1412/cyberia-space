# Unified Guest System + Single RoomScreen

## Overview

Replace the separate guest system (`guestSessions` table, `joinAsGuest`, `leaveGuest`, `sendAsGuest`) with temporary user accounts. Merge InviteScreen and RoomScreen into one unified screen. Guests get a real user identity but are restricted to the single room they were invited to.

---

## Current State

### Two Identity Systems
- **Authenticated users**: `users` table → `presence` table → `messages` with real `userId`
- **Guests**: `guestSessions` table → separate tracking → `messages` with `userId: "guest"`

### Two Room Screens
- **RoomScreen**: Authenticated users only, full features (settings, members, presence)
- **InviteScreen**: Auth + guest support, limited features, separate join/leave/send flows

### Problems
1. Guest messages use `userId: "guest"` — can't distinguish between guests
2. Two code paths for everything (join, leave, send, track)
3. InviteScreen lacks features (presence avatars, message grouping, member list)
4. Guest sessions are room-bound but not user-bound — can't track across sessions
5. Complex auth detection race conditions

---

## Plan

### Phase 1: Backend — Guest as Real Users

#### 1.1 Add `isGuest` field to users table
```typescript
// convex/schema.ts
users: defineTable({
  phone: v.string(),
  handle: v.string(),
  avatarColor: v.string(),
  isGuest: v.optional(v.boolean()),  // NEW
  // ... rest unchanged
})
```

#### 1.2 Create `joinAsTemporaryUser` mutation
Replaces `joinAsGuest`. Creates a real user account + session:

```typescript
// convex/rooms.ts
export const joinAsTemporaryUser = mutation({
  args: {
    roomId: v.id("rooms"),
    password: v.optional(v.string()),
  },
  handler: async (ctx, { roomId, password }) => {
    const room = await ctx.db.get(roomId);
    if (!room) return { error: "Room not found" };
    if (room.type === "hidden") return { error: "Cannot join this room" };
    if (room.type === "private") {
      if (!password) return { error: "Password required" };
      if (password !== room.password) return { error: "Wrong password" };
    }

    // Create temporary user
    const token = generateToken();
    const handle = `guest_${token.slice(0, 6)}`;
    const avatarColor = randomColor();
    const now = Date.now();

    const userId = await ctx.db.insert("users", {
      phone: `guest_${token}`,
      handle,
      avatarColor,
      isGuest: true,
      createdAt: now,
      lastSeen: now,
    });

    // Create session (24h expiry)
    const sessionToken = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
    ).join("");

    await ctx.db.insert("sessions", {
      userId,
      token: sessionToken,
      expiresAt: now + 24 * 60 * 60 * 1000,
      platform: "guest",
    });

    return {
      userId,
      token: sessionToken,
      handle,
      avatarColor,
      roomId,
    };
  },
});
```

#### 1.3 Create `cleanupGuestUsers` internal mutation
Scheduled job to delete orphaned guest accounts:

```typescript
// convex/auth.ts
export const cleanupGuestUsers = internalMutation({
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const oldGuests = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("isGuest"), true))
      .filter((q) => q.lt(q.field("createdAt"), cutoff))
      .collect();

    for (const guest of oldGuests) {
      // Delete their sessions
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", guest._id))
        .collect();
      for (const s of sessions) await ctx.db.delete(s._id);

      // Delete their presence
      const presence = await ctx.db
        .query("presence")
        .withIndex("by_user", (q) => q.eq("userId", guest._id))
        .collect();
      for (const p of presence) {
        const room = await ctx.db.get(p.roomId);
        if (room) {
          await ctx.db.patch(p.roomId, { memberCount: Math.max(0, room.memberCount - 1) });
        }
        await ctx.db.delete(p._id);
      }

      // Delete the user
      await ctx.db.delete(guest._id);
    }
    return { deleted: oldGuests.length };
  },
});
```

#### 1.4 Add cleanup to cron schedule
```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("cleanup guest users", { hours: 1 }, internal.auth.cleanupGuestUsers);

export default crons;
```

#### 1.5 Delete old guest code
Remove from `convex/rooms.ts`:
- `joinAsGuest` mutation
- `leaveGuest` mutation
- `getActiveGuests` query
- `createGuestLink` mutation
- `consumeGuestLink` mutation
- `listGuestLinks` query
- `revokeGuestLink` mutation

Remove from `convex/messages.ts`:
- `sendAsGuest` mutation

Remove from `convex/schema.ts`:
- `guestSessions` table definition

---

### Phase 2: Frontend — Unified RoomScreen

#### 2.1 Merge screens into single `RoomScreen.tsx`

The new RoomScreen handles both cases:
- **Authenticated user**: Normal join flow (existing logic)
- **Invite link**: Creates temporary user account, then same join flow

**Key changes:**
1. Detect invite route: `route.params.fromInvite === true`
2. If from invite + not logged in: call `joinAsTemporaryUser`, store token via `login()`
3. After login, user appears authenticated — same flow as normal RoomScreen
4. Header shows "Login" button instead of back arrow for guests
5. Guest banner: "Guest session · Sign up to keep your messages"

**Navigation guard:**
```typescript
// In RoomScreen, check if user is guest
const isGuest = user?.isGuest === true;

// Header actions
<Header
  title={room?.name ?? name}
  onBack={isGuest ? undefined : () => navigation.goBack()}
  rightLabel={isGuest ? "Login" : undefined}
  onRightPress={isGuest ? handleLogin : undefined}
  // ... rest unchanged
/>
```

**Login handler:**
```typescript
async function handleLogin() {
  // Store current guest's room context
  const guestUserId = userId;
  const guestToken = token;

  // Navigate to auth screen
  navigation.navigate('Auth', {
    preAuthRoomId: roomId,
    preAuthGuestToken: guestToken,
  });
}
```

**On successful auth:**
```typescript
// In AuthScreen, after successful login:
if (preAuthRoomId) {
  // Clean up guest account
  await deleteGuestAccount({ guestToken: preAuthGuestToken });
  // Navigate back to room as real user
  navigation.navigate('Room', { roomId: preAuthRoomId, name: roomName });
}
```

#### 2.2 Update AuthContext to handle guest tokens

Add guest token to context:
```typescript
type AuthCtx = {
  user: any;
  userId: string | null;
  token: string | null;
  isGuest: boolean;  // NEW
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (token: string, userId: string) => Promise<void>;
  loginAsGuest: (token: string, userId: string) => Promise<void>;  // NEW
  logout: () => Promise<void>;
};
```

#### 2.3 Navigation guard in MainTabs

Prevent guests from accessing main app:

```typescript
// src/screens/MainTabs.tsx
export default function MainTabs() {
  const { userId, isGuest } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (isGuest) {
      // Redirect back to the room they came from
      // or show limited UI
    }
  }, [isGuest]);

  // ... rest of component
}
```

#### 2.4 Update `useRoomChat` hook

Simplify by removing guest-specific logic:

```typescript
interface UseRoomChatOptions {
  roomId: string;
  userId: string | null | undefined;
  hasJoined: boolean;
  onJoined?: () => void;
  joinTime: number;
}

// Remove:
// - guest tracking effects
// - filterSince parameter
// - separate guest state
```

#### 2.5 Delete `InviteScreen.tsx`

No longer needed — RoomScreen handles everything.

#### 2.6 Update `App.js` navigation

Remove InviteScreen, update linking config:

```javascript
// App.js
<Stack.Navigator>
  <Stack.Screen name="Boot" component={BootScreen} />
  <Stack.Screen name="Auth" component={AuthScreen} />
  <Stack.Screen name="Main" component={MainTabs} />
  <Stack.Screen name="Room" component={RoomScreen} />
  <Stack.Screen name="DM" component={DMScreen} />
  <Stack.Screen name="NewRoom" component={NewRoomScreen} />
  <Stack.Screen name="NewDM" component={NewDMScreen} />
  {/* InviteScreen removed */}
</Stack.Navigator>

const linking = {
  prefixes: ['cyberia://', 'https://chat.cyberiaspace.app'],
  config: {
    screens: {
      Room: 'invite/:roomId/:password?',  // Invite links go to RoomScreen
    },
  },
};
```

---

### Phase 3: Guest Experience

#### 3.1 Guest UI Restrictions

When `isGuest === true`:
- **Header**: Shows "Login" button instead of back arrow
- **Banner**: "Guest session · Sign up to keep your messages"
- **No access to**: Room settings, create room, DMs, profile
- **Can**: Send messages, see presence, see members

#### 3.2 Guest → Auth Flow

1. Guest taps "Login" in room header
2. Navigates to AuthScreen with room context stored
3. Completes phone OTP verification
4. Backend deletes guest account, creates real account
5. Navigates back to room as authenticated user
6. Messages from guest account are preserved (same room, different userId)

#### 3.3 Guest Expiration

- Session expires after 24h (automatic via `expiresAt`)
- Cron job cleans up orphaned guest users daily
- Manual cleanup when guest navigates away from room

---

## Files to Change

### Backend
| File | Action |
|------|--------|
| `convex/schema.ts` | Add `isGuest` to users, delete `guestSessions` table |
| `convex/rooms.ts` | Add `joinAsTemporaryUser`, delete all guest mutations |
| `convex/messages.ts` | Delete `sendAsGuest` |
| `convex/auth.ts` | Add `cleanupGuestUsers` |
| `convex/crons.ts` | Add guest cleanup cron |

### Frontend
| File | Action |
|------|--------|
| `src/screens/RoomScreen.tsx` | Merge InviteScreen logic, add guest handling |
| `src/screens/InviteScreen.tsx` | Delete |
| `src/context/AuthContext.tsx` | Add `isGuest`, `loginAsGuest` |
| `src/hooks/useRoomChat.ts` | Remove guest tracking |
| `src/screens/MainTabs.tsx` | Add guest navigation guard |
| `App.js` | Remove InviteScreen, update linking |
| `src/components/RoomSettingsSheet.tsx` | Update invite link format |

---

## Migration Strategy

### Step 1: Add new code (don't delete old yet)
1. Add `isGuest` field to users schema
2. Add `joinAsTemporaryUser` mutation
3. Add `cleanupGuestUsers` mutation + cron
4. Update RoomScreen to handle both auth and guest flows

### Step 2: Test new flow
1. Test invite link → temporary account → room access
2. Test guest → login → real account transition
3. Test guest expiration after 24h
4. Test cron cleanup

### Step 3: Remove old code
1. Delete `guestSessions` table from schema
2. Delete all guest mutations from rooms.ts
3. Delete `sendAsGuest` from messages.ts
4. Delete `InviteScreen.tsx`
5. Update navigation config

### Step 4: Data migration (if needed)
- Existing guest messages with `userId: "guest"` can stay as-is
- They'll show as "Someone" in the UI (acceptable for historical data)

---

## Risk Assessment

### Low Risk
- Adding `isGuest` field (backwards compatible)
- Adding new mutations (additive)
- Navigation guards (client-side only)

### Medium Risk
- Deleting `guestSessions` table (breaks old guest sessions)
- Changing invite link routing (old links break)

### Mitigation
- Keep old code until new flow is verified
- Add redirect from old invite links to new format
- Monitor for 24h before full cleanup

---

## Testing Checklist

- [ ] Invite link creates temporary user account
- [ ] Guest can send messages in room
- [ ] Guest sees presence and members
- [ ] Guest sees "Login" button in header
- [ ] Guest taps "Login" → auth screen → real account
- [ ] Guest messages preserved after auth
- [ ] Guest session expires after 24h
- [ ] Cron job cleans up orphaned guest users
- [ ] Guest cannot access MainTabs (rooms list, DMs, profile)
- [ ] Guest cannot access room settings
- [ ] Authenticated user joining via invite link works normally
- [ ] Private room password flow works for both guest and auth
- [ ] Banned user error displays correctly
- [ ] Room deletion navigates back correctly
- [ ] Presence tracking works for both guest and auth users
- [ ] System messages (join/leave) work for both
