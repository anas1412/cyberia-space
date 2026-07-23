import { Doc, Id } from '../../convex/_generated/dataModel';

export interface EnrichedRoom extends Doc<"rooms"> {
  ownerHandle: string;
  ownerColor: string;
}

export interface PresenceMember {
  userId: Id<"users">;
  handle: string;
  avatarColor: string;
  joinedAt: number;
  isGuest: boolean;
}

export interface ConversationListItem extends Doc<"conversations"> {
  other: { handle: string; avatarColor: string; _id: Id<"users"> } | null;
  unreadCount: number;
}

export interface EnrichedDM extends Doc<"directMessages"> {
  handle: string;
  avatarColor: string;
}

export interface BanEntry {
  _id: Id<"roomBans">;
  userId: Id<"users">;
  handle: string;
  bannedAt: number;
}

export interface ChatItem {
  _id: string;
  _kind: 'msg' | 'event';
  timestamp: number;
  userId?: Id<"users">;
  handle?: string;
  type?: 'join' | 'leave';
  isYou?: boolean;
  text?: string;
  avatarColor?: string;
  mentions?: string[];
}
