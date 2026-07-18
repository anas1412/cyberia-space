import { internalMutation } from "./_generated/server";

// Called by cron — removes presence entries not pinged in 90s
export const cleanupStale = internalMutation({
  handler: async (ctx) => {
    const staleThreshold = Date.now() - 90 * 1000;
    const stale = await ctx.db
      .query("presence")
      .filter((q) => q.lt(q.field("lastPing"), staleThreshold))
      .take(200);

    for (const p of stale) {
      await ctx.db.delete(p._id);
      const room = await ctx.db.get(p.roomId);
      if (room && room.memberCount > 0) {
        await ctx.db.patch(p.roomId, { memberCount: room.memberCount - 1 });
      }
    }
    return { cleaned: stale.length };
  },
});
