const MAX_MESSAGE_LENGTH = 1000;
const MAX_MENTIONS = 10;
const MENTION_REGEX = /@[\w]+/g;
const HTML_TAG_REGEX = /<[^>]*>/g;
const CONTROL_CHAR_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export function sanitizeText(raw: string): { clean: string; mentions: string[] } | { error: string } {
  if (!raw || typeof raw !== "string") return { error: "Invalid message" };

  // Strip HTML tags
  let text = raw.replace(HTML_TAG_REGEX, "");

  // Strip control characters (keep newlines \n and tabs \t)
  text = text.replace(CONTROL_CHAR_REGEX, "");

  // Collapse excessive whitespace (3+ newlines → 2, 4+ spaces → 2)
  text = text.replace(/\n{3,}/g, "\n\n").replace(/ {4,}/g, "  ");

  text = text.trim();

  if (text.length === 0) return { error: "Invalid message" };
  if (text.length > MAX_MESSAGE_LENGTH) return { error: "Message too long" };

  // Extract and dedupe mentions, cap at MAX_MENTIONS
  const rawMentions = text.match(MENTION_REGEX) || [];
  const mentions = [...new Set(rawMentions)].slice(0, MAX_MENTIONS);

  return { clean: text, mentions };
}
