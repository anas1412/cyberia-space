import { useState, useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { PresenceMember } from '../types/convex';

interface UseRoomChatOptions {
  roomId: string;
  userId?: Id<"users"> | null;
  hasJoined: boolean;
  onJoined?: () => void;
  joinTime: number;
}

export default function useRoomChat({ roomId, userId, hasJoined, onJoined, joinTime }: UseRoomChatOptions) {
  const [events, setEvents] = useState<any[]>([]);
  const prevPresence = useRef<Set<string>>(new Set());
  const handleCache = useRef<Map<string, string>>(new Map());

  const messages = useQuery(api.messages.subscribe, { roomId: roomId as any, since: joinTime }) ?? [];
  const presence = useQuery(api.rooms.getPresence, { roomId: roomId as any }) ?? [];

  // Track presence changes → system events
  useEffect(() => {
    const currentIds = new Set((presence as any[]).map((p: any) => p.userId));

    for (const p of (presence as any[])) {
      handleCache.current.set(p.userId, p.handle);
    }

    if (!hasJoined) {
      if (userId && currentIds.has(userId)) {
        prevPresence.current = new Set(currentIds);
        // Emit "You joined" system event
        setEvents([{ _id: `join-you-${Date.now()}`, type: 'join', handle: 'You', timestamp: Date.now(), isYou: true }]);
        onJoined?.();
      }
      return;
    }

    const prev = prevPresence.current;
    const now = Date.now();

    for (const id of currentIds) {
      if (!prev.has(id) && id !== userId) {
        const p = (presence as any[]).find((x: any) => x.userId === id);
        if (p) {
          setEvents(prev => [...prev, { _id: `join-${id}-${now}`, type: 'join', handle: p.handle, timestamp: now }]);
        }
      }
    }

    for (const id of prev) {
      if (!currentIds.has(id) && id !== userId) {
        const cached = handleCache.current.get(id) || 'Someone';
        setEvents(prev => [...prev, { _id: `leave-${id}-${now}`, type: 'leave', handle: cached, timestamp: now }]);
      }
    }

    prevPresence.current = new Set(currentIds);
  }, [presence, userId, hasJoined]);

  const items = [
    ...messages.map((m: any) => ({ ...m, _kind: 'msg' as const })),
    ...events.map((e: any) => ({ ...e, _kind: 'event' as const })),
  ].sort((a: any, b: any) => a.timestamp - b.timestamp);

  return { items, presence, messages };
}
