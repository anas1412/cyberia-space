/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

async function createTestUser(t: ReturnType<typeof convexTest>, handle: string) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      phone: `+1555${Math.random().toString().slice(2, 10)}`,
      handle,
      avatarColor: "#E8A840",
      createdAt: Date.now(),
      lastSeen: Date.now(),
    });
  });
}

// ── Auth ──

test("setHandle updates user handle", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "old-handle");

  const result = await t.mutation(api.auth.setHandle, {
    userId,
    handle: "new_handle",
    avatarColor: "#FF0000",
  });
  expect(result.handle).toBe("new_handle");

  const user = await t.run(async (ctx) => await ctx.db.get(userId));
  expect(user?.handle).toBe("new_handle");
  expect(user?.avatarColor).toBe("#FF0000");
});

test("setHandle rejects short handles", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "short-test");

  await expect(
    t.mutation(api.auth.setHandle, { userId, handle: "a", avatarColor: "#000" })
  ).rejects.toThrow("Handle too short");
});

test("setHandle rejects taken handles", async () => {
  const t = convexTest(schema, modules);
  await createTestUser(t, "taken_handle");
  const user2 = await createTestUser(t, "other_user");

  await expect(
    t.mutation(api.auth.setHandle, { userId: user2, handle: "taken_handle", avatarColor: "#000" })
  ).rejects.toThrow("Handle taken");
});

test("setHandle strips special characters", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "special-test");

  const result = await t.mutation(api.auth.setHandle, {
    userId,
    handle: "my@handle!#$",
    avatarColor: "#000",
  });
  expect(result.handle).toBe("myhandle");
});

test("validateSession returns user for valid token", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "session-user");

  const token = "test-token-valid";
  await t.run(async (ctx) => {
    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt: Date.now() + 3600000,
      platform: "test",
    });
  });

  const user = await t.query(api.auth.validateSession, { token });
  expect(user).not.toBeNull();
  expect(user?._id).toBe(userId);
});

test("validateSession returns null for expired token", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "expired-user");

  await t.run(async (ctx) => {
    await ctx.db.insert("sessions", {
      userId,
      token: "expired-token",
      expiresAt: Date.now() - 1000,
      platform: "test",
    });
  });

  const user = await t.query(api.auth.validateSession, { token: "expired-token" });
  expect(user).toBeNull();
});

test("logout deletes session", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "logout-user");

  const token = "logout-token";
  await t.run(async (ctx) => {
    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt: Date.now() + 3600000,
      platform: "test",
    });
  });

  const before = await t.query(api.auth.validateSession, { token });
  expect(before).not.toBeNull();

  await t.mutation(api.auth.logout, { token });

  const after = await t.query(api.auth.validateSession, { token });
  expect(after).toBeNull();
});

// ── Notifications ──

test("notifications list returns user notifications", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "notif-user");
  const fromUserId = await createTestUser(t, "notif-from");

  await t.run(async (ctx) => {
    await ctx.db.insert("notifications", {
      userId,
      type: "dm",
      fromUserId,
      fromHandle: "notif-from",
      text: "Hey!",
      read: false,
      timestamp: Date.now(),
      expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
    });
  });

  const notifications = await t.query(api.notifications.list, { userId });
  expect(notifications).toHaveLength(1);
  expect(notifications[0]!.text).toBe("Hey!");
  expect(notifications[0]!.read).toBe(false);
});

test("notifications list excludes other users notifications", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "notif-isolated");
  const otherId = await createTestUser(t, "notif-other");
  const fromUserId = await createTestUser(t, "notif-from2");

  await t.run(async (ctx) => {
    await ctx.db.insert("notifications", {
      userId: otherId,
      type: "dm",
      fromUserId,
      fromHandle: "notif-from2",
      text: "Not for you",
      read: false,
      timestamp: Date.now(),
      expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
    });
  });

  const notifications = await t.query(api.notifications.list, { userId });
  expect(notifications).toHaveLength(0);
});

// ── Rate limiting ──

test("message rate limit blocks after 30 messages per minute", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "ratelimit-user");

  const { roomId } = await t.mutation(api.rooms.create, {
    userId,
    name: "rate-limit-room",
    type: "public",
  });

  // Send 30 messages (the limit)
  for (let i = 0; i < 30; i++) {
    await t.mutation(api.messages.send, { roomId, userId, text: `msg ${i}` });
  }

  // 31st should fail
  await expect(
    t.mutation(api.messages.send, { roomId, userId, text: "flood" })
  ).rejects.toThrow("Rate limit exceeded");
});

test("guest creation rate limit blocks after 3 per room per 10 minutes", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await createTestUser(t, "guest-rl-owner");

  const { roomId } = await t.mutation(api.rooms.create, {
    userId: ownerId,
    name: "guest-rl-room",
    type: "public",
  });

  // Create 3 guests (the limit)
  for (let i = 0; i < 3; i++) {
    await t.mutation(api.rooms.joinAsTemporaryUser, { roomId });
  }

  // 4th should fail
  await expect(
    t.mutation(api.rooms.joinAsTemporaryUser, { roomId })
  ).rejects.toThrow("Rate limit exceeded");
});
