import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import Twilio from "twilio";

export const sendSms = internalAction({
  args: { phone: v.string(), code: v.string() },
  handler: async (_, { phone, code }) => {
    const client = Twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
    await client.messages.create({
      body: `Your Cyberia code is: ${code}`,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID!,
      to: phone,
    });
  },
});
