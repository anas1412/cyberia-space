export type RootStackParamList = {
  Boot: undefined;
  Auth: { preAuthRoomId?: string; preAuthRoomName?: string; preAuthPassword?: string };
  Main: undefined;
  Room: { roomId: string; password?: string };
  DM: { conversationId: string };
  NewRoom: undefined;
  NewDM: undefined;
  Invite: { roomId: string; password?: string };
  Kicked: { roomName: string; isGuest?: boolean; reason?: 'kicked' | 'room-deleted' };
};

export type MainTabParamList = {
  Rooms: undefined;
  DMList: undefined;
  Profile: undefined;
};
