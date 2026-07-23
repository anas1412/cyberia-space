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

test("create a public room", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "alice");

  const result = await t.mutation(api.rooms.create, {
    userId,
    name: "test-room",
    type: "public",
  });

  expect(result.name).toBe("test-room");
  expect(result.roomId).toBeDefined();
});

test("create a private room generates password", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "bob");

  const result = await t.mutation(api.rooms.create, {
    userId,
    name: "private-room",
    type: "private",
  });

  expect(result.name).toBe("private-room");
  const room = await t.run(async (ctx) => await ctx.db.get(result.roomId));
  expect(room?.password).toBeDefined();
  expect(room?.password).toHaveLength(6);
});

test("one room per user enforced", async () => {
  const t = convexTest(schema, modules);
  const userId = await createTestUser(t, "carol");

  const first = await t.mutation(api.rooms.create, {
    userId,
    name: "first-room",
    type: "public",
  });

  // Second call returns existing room instead of creating a new one
  const second = await t.mutation(api.rooms.create, {
    userId,
    name: "second-room",
    type: "public",
  });

  expect(second.roomId).toBe(first.roomId);
  expect(second.name).toBe("first-room");
});

test("join and leave a public room", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await createTestUser(t, "owner");
  const joinerId = await createTestUser(t, "joiner");

  const { roomId } = await t.mutation(api.rooms.create, {
    userId: ownerId,
    name: "join-test",
    type: "public",
  });

  await t.mutation(api.rooms.join, { userId: joinerId, roomId });

  const presence = await t.query(api.rooms.getPresence, { roomId });
  expect(presence).toHaveLength(1);
  expect(presence[0]!.userId).toBe(joinerId);

  await t.mutation(api.rooms.leave, { userId: joinerId, roomId });

  const presenceAfter = await t.query(api.rooms.getPresence, { roomId });
  expect(presenceAfter).toHaveLength(0);
});

test("cannot join hidden room without invite", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await createTestUser(t, "hidden-owner");
  const joinerId = await createTestUser(t, "intruder");

  const { roomId } = await t.mutation(api.rooms.create, {
    userId: ownerId,
    name: "secret",
    type: "hidden",
  });

  await expect(
    t.mutation(api.rooms.join, { userId: joinerId, roomId })
  ).rejects.toThrow("Cannot join this room");
});

test("private room requires password", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await createTestUser(t, "priv-owner");
  const joinerId = await createTestUser(t, "priv-joiner");

  const { roomId } = await t.mutation(api.rooms.create, {
    userId: ownerId,
    name: "locked",
    type: "private",
  });

  await expect(
    t.mutation(api.rooms.join, { userId: joinerId, roomId })
  ).rejects.toThrow("Password required");
});

test("ban and unban user", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await createTestUser(t, "ban-owner");
  const targetId = await createTestUser(t, "ban-target");

  const { roomId } = await t.mutation(api.rooms.create, {
    userId: ownerId,
    name: "ban-room",
    type: "public",
  });

  await t.mutation(api.rooms.join, { userId: targetId, roomId });
  await t.mutation(api.rooms.ban, { roomId, ownerId, userId: targetId });

  const bans = await t.query(api.rooms.listBans, { roomId });
  expect(bans).toHaveLength(1);
  expect(bans[0]!.userId).toBe(targetId);

  await t.mutation(api.rooms.unban, { roomId, ownerId, userId: targetId });
  const bansAfter = await t.query(api.rooms.listBans, { roomId });
  expect(bansAfter).toHaveLength(0);
});

test("banned user cannot rejoin", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await createTestUser(t, "ban2-owner");
  const targetId = await createTestUser(t, "ban2-target");

  const { roomId } = await t.mutation(api.rooms.create, {
    userId: ownerId,
    name: "ban2-room",
    type: "public",
  });

  await t.mutation(api.rooms.ban, { roomId, ownerId, userId: targetId });

  await expect(
    t.mutation(api.rooms.join, { userId: targetId, roomId })
  ).rejects.toThrow("You are banned");
});

test("owner can delete room", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await createTestUser(t, "del-owner");

  const { roomId } = await t.mutation(api.rooms.create, {
    userId: ownerId,
    name: "delete-me",
    type: "public",
  });

  await t.mutation(api.rooms.remove, { roomId, userId: ownerId });

  const room = await t.run(async (ctx) => await ctx.db.get(roomId));
  expect(room).toBeNull();
});

test("non-owner cannot delete room", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await createTestUser(t, "del2-owner");
  const otherId = await createTestUser(t, "del2-other");

  const { roomId } = await t.mutation(api.rooms.create, {
    userId: ownerId,
    name: "no-delete",
    type: "public",
  });

  await expect(
    t.mutation(api.rooms.remove, { roomId, userId: otherId })
  ).rejects.toThrow("Not the owner");
});

test("update room name and type", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await createTestUser(t, "upd-owner");

  const { roomId } = await t.mutation(api.rooms.create, {
    userId: ownerId,
    name: "old-name",
    type: "public",
  });

  await t.mutation(api.rooms.update, {
    roomId,
    userId: ownerId,
    name: "new-name",
    type: "private",
  });

  const room = await t.run(async (ctx) => await ctx.db.get(roomId));
  expect(room?.name).toBe("new-name");
  expect(room?.type).toBe("private");
  expect(room?.password).toBeDefined();
});

test("room name cannot be empty", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await createTestUser(t, "empty-owner");

  const { roomId } = await t.mutation(api.rooms.create, {
    userId: ownerId,
    name: "has-name",
    type: "public",
  });

  await expect(
    t.mutation(api.rooms.update, { roomId, userId: ownerId, name: "  " })
  ).rejects.toThrow("Room name required");
});

test("get password returns null for non-owner", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await createTestUser(t, "pw-owner");
  const otherId = await createTestUser(t, "pw-other");

  const { roomId } = await t.mutation(api.rooms.create, {
    userId: ownerId,
    name: "pw-room",
    type: "private",
  });

  const pw = await t.query(api.rooms.getPassword, { roomId, userId: otherId });
  expect(pw).toBeNull();
});

test("regenerate password", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await createTestUser(t, "regen-owner");

  const { roomId } = await t.mutation(api.rooms.create, {
    userId: ownerId,
    name: "regen-room",
    type: "private",
  });

  const oldPw = await t.query(api.rooms.getPassword, { roomId, userId: ownerId });
  const result = await t.mutation(api.rooms.regeneratePassword, { roomId, userId: ownerId });
  expect(result.password).not.toBe(oldPw);

  const newPw = await t.query(api.rooms.getPassword, { roomId, userId: ownerId });
  expect(newPw).toBe(result.password);
});

test("guest can join via invite", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await createTestUser(t, "guest-owner");

  const { roomId } = await t.mutation(api.rooms.create, {
    userId: ownerId,
    name: "guest-room",
    type: "public",
  });

  const guest = await t.mutation(api.rooms.joinAsTemporaryUser, { roomId });
  expect(guest.userId).toBeDefined();
  expect(guest.handle).toMatch(/^guest_/);
  expect(guest.token).toBeDefined();
  expect(guest.roomId).toBe(roomId);

  // Verify guest user exists in the database
  const user = await t.run(async (ctx) => await ctx.db.get(guest.userId));
  expect(user?.isGuest).toBe(true);
  expect(user?.handle).toMatch(/^guest_/);
});

test("kick user removes presence", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await createTestUser(t, "kick-owner");
  const targetId = await createTestUser(t, "kick-target");

  const { roomId } = await t.mutation(api.rooms.create, {
    userId: ownerId,
    name: "kick-room",
    type: "public",
  });

  await t.mutation(api.rooms.join, { userId: targetId, roomId });
  const result = await t.mutation(api.rooms.kick, { roomId, ownerId, userId: targetId });
  expect(result.wasGuest).toBe(false);

  const presence = await t.query(api.rooms.getPresence, { roomId });
  expect(presence).toHaveLength(0);
});

test("kick guest deletes their account", async () => {
  const t = convexTest(schema, modules);
  const ownerId = await createTestUser(t, "kick2-owner");

  const { roomId } = await t.mutation(api.rooms.create, {
    userId: ownerId,
    name: "kick2-room",
    type: "public",
  });

  const guest = await t.mutation(api.rooms.joinAsTemporaryUser, { roomId });
  const result = await t.mutation(api.rooms.kick, {
    roomId,
    ownerId,
    userId: guest.userId,
  });
  expect(result.wasGuest).toBe(true);

  const user = await t.run(async (ctx) => await ctx.db.get(guest.userId));
  expect(user).toBeNull();
});
