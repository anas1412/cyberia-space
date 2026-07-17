import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up expired messages every hour
crons.interval("cleanup expired messages", { hours: 1 }, internal.messages.cleanupExpired);
crons.interval("cleanup expired DMs", { hours: 1 }, internal.dms.cleanupExpired);
crons.interval("cleanup expired notifications", { hours: 1 }, internal.notifications.cleanupExpired);

// Clean up stale presence every 2 minutes
crons.interval("cleanup stale presence", { minutes: 2 }, internal.presence.cleanupStale);

export default crons;
