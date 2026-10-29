const MAP: Record<string, string> = {
  // Auth
  'No OTP found. Request a new one.': 'Code expired. Request a new one.',
  'OTP expired.': 'Code expired. Request a new one.',
  'Invalid code.': 'Wrong code. Try again.',

  // Handle
  'Handle too short.': 'Handle must be at least 2 characters.',
  'Handle too short': 'Handle must be at least 2 characters.',
  'Handle taken.': 'That handle is taken. Try another.',
  'Handle taken': 'That handle is taken. Try another.',

  // User
  'User not found.': 'Account not found.',
  'User not found': 'Account not found.',

  // Room
  'Room name required': 'Enter a room name.',
  'Room limit reached. Create a hidden room instead.': 'You already have a room. Create a hidden room instead.',
  'Room limit reached. Keep your room hidden.': 'You already have a room.',
  'Room not found': 'Room not found or deleted.',
  'Password required': 'This room requires a password.',
  'Wrong password': 'Wrong password. Try again.',
  'Cannot join this room': 'Unable to join this room.',
  'You are banned from this room': "You've been banned from this room.",
  'Not the owner': 'Only the room owner can do that.',
  'Cannot kick yourself': "You can't kick yourself.",
  'Cannot ban yourself': "You can't ban yourself.",

  // Messages
  'Invalid message': "Message can't be empty.",
  'Message too long': 'Message is too long.',

  // DMs
  'Cannot DM yourself': "You can't message yourself.",
  'Conversation not found': 'Conversation not found.',
};

export function friendlyError(raw: string): string {
  if (!raw) return 'Something went wrong. Try again.';

  // Match rate limit pattern: "Rate limit exceeded. Try again in 42s."
  const rateMatch = raw.match(/^Rate limit exceeded\. Try again in (\d+)s\.$/);
  if (rateMatch) return `Too many requests. Try again in ${rateMatch[1]}s.`;

  return MAP[raw] ?? 'Something went wrong. Try again.';
}
