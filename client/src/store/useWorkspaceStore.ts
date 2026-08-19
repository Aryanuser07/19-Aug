import { create } from 'zustand';
import api from '../services/api';
import { socketService } from '../services/socket';
import { UserRole } from './useAuthStore';

export interface Room {
  _id: string;
  name: string;
  description?: string;
  allowedRoles: UserRole[];
  isDefault?: boolean;
}

export interface Channel {
  _id: string;
  roomId: string;
  name: string;
  type: 'text' | 'voice' | 'video';
  description?: string;
  isDefault?: boolean;
}

export interface Message {
  _id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  createdAt: string;
}

export interface PresenceUser {
  userId: string;
  userName: string;
  userEmail: string;
  avatar?: string;
  role: UserRole;
  connectionCount: number;
  status: 'online' | 'in-call' | 'in-breakout';
  currentRoomId?: string;
  currentChannelId?: string;
  currentChannelName?: string;
  breakoutRoomId?: string;
  joinedAt: string;
}

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
}

interface WorkspaceState {
  rooms: Room[];
  channels: Channel[];
  currentRoom: Room | null;
  currentChannel: Channel | null;
  messages: Message[];
  onlinePresences: PresenceUser[];
  breakoutInvite: { breakoutId: string; breakoutName: string; createdBy: string; invitedMembers: string[] } | null;
  toasts: Toast[];

  fetchRooms: () => Promise<void>;
  selectRoom: (room: Room) => Promise<void>;
  selectChannel: (channel: Channel) => Promise<void>;
  fetchMessages: (channelId: string) => Promise<void>;
  addMessage: (msg: Message) => void;
  setOnlinePresences: (presences: PresenceUser[]) => void;
  setBreakoutInvite: (invite: any) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setupSocketListeners: () => void;
}

const LAST_ROOM_KEY = 'tcp_last_room_id';
const LAST_CHANNEL_KEY = 'tcp_last_channel_id';

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  rooms: [],
  channels: [],
  currentRoom: null,
  currentChannel: null,
  messages: [],
  onlinePresences: [],
  breakoutInvite: null,
  toasts: [],

  fetchRooms: async () => {
    try {
      const res = await api.get('/rooms');
      const rooms: Room[] = res.data.rooms;
      set({ rooms });

      // Restore last visited room from localStorage on reload, or fallback to default room
      if (rooms.length > 0 && !get().currentRoom) {
        const savedRoomId = localStorage.getItem(LAST_ROOM_KEY);
        const savedRoom = rooms.find((r) => r._id === savedRoomId);
        const targetRoom = savedRoom || rooms.find((r) => r.isDefault) || rooms[0];
        get().selectRoom(targetRoom);
      }
    } catch (err) {
      console.error('Failed to fetch rooms', err);
    }
  },

  selectRoom: async (room) => {
    localStorage.setItem(LAST_ROOM_KEY, room._id);
    set({ currentRoom: room, channels: [], currentChannel: null, messages: [] });
    try {
      const res = await api.get(`/rooms/${room._id}/channels`);
      const channels: Channel[] = res.data.channels;
      set({ channels });

      if (channels.length > 0) {
        // Restore last visited channel in this room from localStorage on reload, or fallback to default
        const savedChannelId = localStorage.getItem(LAST_CHANNEL_KEY);
        const savedChannel = channels.find((c) => c._id === savedChannelId);
        const targetChannel = savedChannel || channels.find((c) => c.isDefault) || channels[0];
        get().selectChannel(targetChannel);
      }
    } catch (err) {
      console.error('Failed to fetch channels for room', err);
    }
  },

  selectChannel: async (channel) => {
    const { currentRoom, currentChannel } = get();

    localStorage.setItem(LAST_CHANNEL_KEY, channel._id);

    if (currentChannel?._id === channel._id) return;

    // Socket leave previous channel if any
    const socket = socketService.getSocket();
    if (currentChannel) {
      socket?.emit('channel:leave', { channelId: currentChannel._id });
    }

    set({ currentChannel: channel, messages: [] });

    // Join new channel via socket with ack
    if (currentRoom) {
      const ack = await socketService.emitWithAck('channel:join', {
        roomId: currentRoom._id,
        channelId: channel._id,
        channelName: channel.name,
        isVoice: channel.type !== 'text',
      });

      if (!ack.success) {
        get().addToast({
          type: 'error',
          title: 'Access Denied',
          message: ack.message || 'Could not join channel',
        });
        return;
      }
    }

    if (channel.type === 'text') {
      get().fetchMessages(channel._id);
    }
  },

  fetchMessages: async (channelId) => {
    try {
      const res = await api.get(`/rooms/channels/${channelId}/messages`);
      set({ messages: res.data.messages });
    } catch (err) {
      console.error('Failed to fetch channel messages', err);
    }
  },

  addMessage: (msg) => {
    set((state) => ({
      messages: state.currentChannel?._id === msg.channelId ? [...state.messages, msg] : state.messages,
    }));
  },

  setOnlinePresences: (presences) => set({ onlinePresences: presences }),
  setBreakoutInvite: (invite) => set({ breakoutInvite: invite }),

  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  setupSocketListeners: () => {
    const socket = socketService.getSocket();
    if (!socket) return;

    socket.off('presence:sync');
    socket.off('chat:new_message');
    socket.off('user:force_switch_channel');
    socket.off('breakout:invited');

    socket.on('presence:sync', (presences: PresenceUser[]) => {
      get().setOnlinePresences(presences);
    });

    socket.on('chat:new_message', (message: Message) => {
      get().addMessage(message);
    });

    socket.on('user:force_switch_channel', async (data: { targetRoomId: string; targetChannelId: string; targetChannelName: string; movedBy: string }) => {
      const { targetRoomId, targetChannelId, targetChannelName, movedBy } = data;

      get().addToast({
        type: 'info',
        title: 'Admin Forced Move',
        message: `You were moved to #${targetChannelName} by ${movedBy}`,
      });

      // Refresh rooms and auto-navigate to target room and channel
      const rooms = get().rooms;
      const targetRoom = rooms.find((r) => r._id === targetRoomId);
      if (targetRoom) {
        await get().selectRoom(targetRoom);
        const channels = get().channels;
        const targetChannel = channels.find((c) => c._id === targetChannelId);
        if (targetChannel) {
          get().selectChannel(targetChannel);
        }
      }
    });

    socket.on('breakout:invited', (inviteData: any) => {
      get().setBreakoutInvite(inviteData);
      get().addToast({
        type: 'warning',
        title: 'Breakout Meeting Invite',
        message: `${inviteData.createdBy} invited you to '${inviteData.breakoutName}'`,
      });
    });
  },
}));
