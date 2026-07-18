# Responsive Desktop Plan — Option 1

## Architecture

### Centralized responsive system

**1. `src/lib/responsive.ts`** — single source of truth

Exports:

```ts
// Breakpoint constants
export const BREAKPOINTS = { sm: 0, md: 768, lg: 1024 } as const;

// Hook — returns everything a screen needs in one call
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const bp = width >= BREAKPOINTS.lg ? 'lg' : width >= BREAKPOINTS.md ? 'md' : 'sm';

  return {
    bp,                          // 'sm' | 'md' | 'lg'
    isMobile: bp === 'sm',
    isTablet: bp === 'md',
    isDesktop: bp === 'lg',
    width,
    height,

    // Layout tokens — screens never pick their own max-widths
    contentMaxWidth: bp === 'lg' ? 720 : bp === 'md' ? 600 : '100%',
    chatMaxWidth:   bp === 'lg' ? 800 : bp === 'md' ? 640 : '100%',
    sheetMaxWidth:  bp === 'lg' ? 480 : '100%',
    cardMaxWidth:   bp === 'lg' ? 480 : '100%',
    authMaxWidth:   bp === 'lg' ? 420 : '100%',

    // Component tokens — consistent sizing across all screens
    avatar: bp === 'lg' ? 32 : bp === 'md' ? 28 : 26,
    chatAvatar: bp === 'lg' ? 36 : 28,
    listAvatar: bp === 'lg' ? 52 : 48,

    // Typography — scale up on desktop
    bodyFontSize:  bp === 'lg' ? 16 : 15,
    titleFontSize: bp === 'lg' ? 18 : 17,
    chatFontSize:  bp === 'lg' ? 16 : 15,

    // Spacing
    screenPadding: bp === 'lg' ? 24 : 16,
    cardPadding:   bp === 'lg' ? 20 : 16,

    // Chat
    bubbleMaxWidth: bp === 'lg' ? '55%' : '70%',

    // Input (prevents iOS zoom on desktop)
    inputFontSize: bp === 'lg' ? 16 : 15,
  };
}
```

**2. `src/components/ContentWrap.tsx`** — centered content container

```tsx
// Usage: <ContentWrap variant="content"><RoomsListScreen /></ContentWrap>
// Handles: maxWidth, horizontal padding, centering
```

| Variant | Used by | maxWidth |
|---------|---------|----------|
| `content` | RoomsList, DMList, NewRoom, NewDM | 720 (lg) / 600 (md) / 100% |
| `chat` | RoomScreen, DMScreen | 800 (lg) / 640 (md) / 100% |
| `auth` | AuthScreen | 420 (lg) / 100% |
| `card` | ProfileScreen | 480 (lg) / 100% |

Picks the right maxWidth from `useResponsive()`. Handles horizontal padding and centering automatically.

**3. `src/components/ResponsiveLayout.tsx`** — app shell wrapper

Wraps the entire authenticated app. On `lg`, renders:

```
┌──────────┬───────────────────────────┐
│ Sidebar  │                           │
│ 200px    │     <Stack.Navigator />   │
│          │     (full content)         │
│          │                           │
└──────────┴───────────────────────────┘
```

On `sm`/`md`, renders children as-is (bottom tabs work normally).

- Sidebar renders the same 3 tabs (Rooms, Messages, Profile) as vertical icons + labels
- Active tab gets accent color highlight
- Unread DM badge shown on the Messages icon
- The underlying tab navigator still handles navigation; sidebar just provides the visual chrome
- Sidebar background matches `colors.bg`, border-right matches `colors.border`

**4. `src/components/ResponsiveSheet.tsx`** — bottom sheet that adapts

Replaces `BottomSheet.tsx`.

On `sm`/`md`: current slide-from-bottom behavior.
On `lg`: centered modal dialog (maxWidth 480px, rounded corners on all sides, centered in viewport, dark overlay).

Same props as current `BottomSheet` — drop-in replacement.

---

## File changes

### New files

| File | Purpose |
|------|---------|
| `src/lib/responsive.ts` | Centralized hook + breakpoint constants + all responsive tokens |
| `src/components/ContentWrap.tsx` | Centered content container with responsive maxWidth/padding |
| `src/components/ResponsiveLayout.tsx` | App shell: sidebar on desktop, passthrough on mobile |
| `src/components/ResponsiveSheet.tsx` | Bottom sheet / centered modal based on breakpoint |

### Modified files

| File | Changes |
|------|---------|
| `src/screens/MainTabs.tsx` | Wrapped by `ResponsiveLayout`. Tab bar hidden on `lg` (sidebar replaces it). |
| `src/screens/RoomsListScreen.tsx` | Wrap content in `<ContentWrap variant="content">`. Remove manual padding. |
| `src/screens/DMListScreen.tsx` | Same — wrap in `<ContentWrap variant="content">`. |
| `src/screens/RoomScreen.tsx` | Constrain chat area with `<ContentWrap variant="chat">`. Use responsive tokens for avatar, font, bubble width. |
| `src/screens/DMScreen.tsx` | Same chat treatment as RoomScreen. |
| `src/screens/ProfileScreen.tsx` | Wrap in `<ContentWrap variant="card">`. |
| `src/screens/AuthScreen.tsx` | Wrap in `<ContentWrap variant="auth">`. |
| `src/screens/NewRoomScreen.tsx` | Wrap in `<ContentWrap variant="content">`. |
| `src/screens/NewDMScreen.tsx` | Wrap in `<ContentWrap variant="content">`. |
| `src/components/Header.tsx` | Use `useResponsive()` for padding/font size. |
| `src/components/MessageBubble.tsx` | Use `useResponsive()` for avatar size, font size, bubble max-width. |
| `src/components/BottomSheet.tsx` | Refactor to `ResponsiveSheet` behavior (or replace with import). |
| `src/components/RoomSettingsSheet.tsx` | Import `ResponsiveSheet` instead of `BottomSheet`. |
| `src/components/MembersSheet.tsx` | Import `ResponsiveSheet` instead of `BottomSheet`. |
| `src/components/Input.tsx` | Accept optional `fontSize` prop from responsive tokens (prevents iOS zoom). |

### Unchanged files

| File | Why |
|------|-----|
| `App.js` | Navigation logic untouched |
| `src/lib/theme.ts` | Colors/radius/spacing stay; responsive tokens live in `responsive.ts` |
| `src/lib/sharedStyles.ts` | Primitives unchanged; screens apply responsive tokens on top |
| All Convex files | Zero server changes |
| `src/components/DiceBearAvatar.tsx` | Size passed as prop from parent |
| `src/components/ChatInput.tsx` | Size inherited from parent |
| `src/components/Loading.tsx` | Layout-agnostic |
| `src/components/EmptyState.tsx` | Layout-agnostic |
| `src/components/ColorPicker.tsx` | Layout-agnostic |
| `src/components/SearchBar.tsx` | Layout-agnostic |
| `src/components/SystemMessage.tsx` | Layout-agnostic |
| `src/components/Button.tsx` | Layout-agnostic |
| `src/components/Avatar.tsx` | Layout-agnostic |

---

## Implementation order

| Step | What | Files | Time |
|------|------|-------|------|
| 1 | Create `responsive.ts` — hook + all tokens | `src/lib/responsive.ts` | 10 min |
| 2 | Create `ContentWrap.tsx` | `src/components/ContentWrap.tsx` | 10 min |
| 3 | Create `ResponsiveSheet.tsx` | `src/components/ResponsiveSheet.tsx` | 10 min |
| 4 | Create `ResponsiveLayout.tsx` — sidebar shell | `src/components/ResponsiveLayout.tsx` | 30 min |
| 5 | Wire `ResponsiveLayout` into `MainTabs.tsx` | `src/screens/MainTabs.tsx` | 10 min |
| 6 | Wrap screens in `ContentWrap` | `RoomsListScreen`, `DMListScreen`, `ProfileScreen`, `AuthScreen`, `NewRoomScreen`, `NewDMScreen` | 15 min |
| 7 | Responsive chat — `RoomScreen.tsx` + `DMScreen.tsx` | Constrain width, use responsive tokens | 15 min |
| 8 | Responsive `MessageBubble.tsx` | Avatar, font, bubble width from tokens | 10 min |
| 9 | Responsive `Header.tsx` | Padding + font from tokens | 5 min |
| 10 | Migrate sheets to `ResponsiveSheet` | `RoomSettingsSheet`, `MembersSheet` | 10 min |
| 11 | `Input.tsx` — accept fontSize prop | `src/components/Input.tsx` | 5 min |
| 12 | `npm run verify` + fix | — | 5 min |

**Total: ~2 hours**

---

## Key design decisions

1. **Screens never import `useWindowDimensions` directly** — they use `useResponsive()` which returns pre-computed tokens. Zero breakpoint logic in screens.

2. **`ContentWrap` is the only layout wrapper screens need** — one line, picks the right maxWidth from the variant. No screen-level max-width constants.

3. **Sidebar replaces tab bar on desktop, not alongside it** — on `lg`, the bottom tab bar is hidden and the sidebar takes over. Same navigation, different chrome.

4. **Sheets become modals on desktop** — `ResponsiveSheet` handles the switch. Callers don't know or care.

5. **No new dependencies** — everything uses React Native's `useWindowDimensions` and existing styling.

6. **Mobile is pixel-identical** — `useResponsive()` returns the same values on `sm` as today's hardcoded values. Zero regression risk.

---

## Visual: what changes where

```
MOBILE (sm)                    DESKTOP (lg)
┌──────────────┐               ┌─────┬──────────────────┐
│  Header      │               │     │  Header           │
├──────────────┤               │ Rooms├─────────────────┤
│              │               │     │                   │
│  Content     │               │ Mess │  Content         │
│  (full width)│               │ ages │  (720px, centered)│
│              │               │     │                   │
├──────────────┤               │ Prof ├─────────────────┤
│ [Rooms][Msg] │               │     │  Chat Input       │
│   [Profile]  │               └─────┴──────────────────┘
└──────────────┘
```

```
CHAT (sm)                       CHAT (lg)
┌──────────────┐               ┌─────┬──────────────────┐
│  Header      │               │     │  Header           │
├──────────────┤               │     ├─────────────────┤
│ msg          │               │     │  msg              │
│   msg        │               │     │    msg            │
│     msg      │               │     │      msg          │
│ msg          │               │     │  msg              │
├──────────────┤               │     ├─────────────────┤
│ [input     ] │               │     │ [input          ] │
└──────────────┘               └─────┴──────────────────┘
  bubbles: 70% max               bubbles: 55% max, centered
  avatar: 28px                    avatar: 36px
```
