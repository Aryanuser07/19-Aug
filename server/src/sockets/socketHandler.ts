import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { presenceStore } from './presenceStore';
import Message from '../models/Message';
import Channel from '../models/Channel';
import Room from '../models/Room';
import User, { UserRole } from '../models/User';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
  };
}

export type AckCallback = (response: { success: boolean; message?: string; data?: any }) => void;

// In-memory registry for active breakout room members
const activeBreakouts = new Map<string, { name: string; memberIds: Set<string> }>();

// Simple HTML sanitizer to prevent XSS payloads
const sanitizeText = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};

export const setupSocketHandlers = (io: Server): void => {
  // Socket JWT Auth Middleware (B1, B2)
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication token missing'));
    }

    try {
      const secret = process.env.JWT_SECRET || 'supersecret_jwt_key_team_collaboration_2026';
      const decoded = jwt.verify(token, secret) as { id: string; role: UserRole };

      User.findById(decoded.id)
        .then((user) => {
          if (!user) return next(new Error('User belonging to token no longer exists'));

          socket.user = {
            id: (user._id as any).toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
          };
          next();
        })
        .catch((err) => next(err));
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return next(new Error('Token has expired'));
      } else if (err.name === 'JsonWebTokenError') {
        return next(new Error('Invalid or malformed token'));
      } else {
        return next(new Error('Authentication failed'));
      }
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    if (!socket.user) return;

    const userId = socket.user.id;
    console.log(`[Socket] Client connected: ${socket.user.name} (${socket.user.role}) - Socket ID: ${socket.id}`);

    // Join user's personal room for targeted events (forced move, breakout invites)
    socket.join(`user:${userId}`);

    // Add socket connection to multi-tab presence store (C2)
    presenceStore.addSocket(userId, socket.id, {
      name: socket.user.name,
      email: socket.user.email,
      avatar: socket.user.avatar,
      role: socket.user.role,
    });

    // Broadcast updated presence list to all connected clients (B3)
    io.emit('presence:sync', presenceStore.getAllPresences());

    // --- Channel Navigation & Socket-Level RBAC Check (D1, C4) ---
    socket.on('channel:join', async (data: { roomId: string; channelId: string; channelName?: string; isVoice?: boolean }, callback?: AckCallback) => {
      try {
        const { roomId, channelId, channelName, isVoice } = data;

        if (!socket.user) {
          callback?.({ success: false, message: 'Unauthenticated socket' });
          return;
        }

        // Socket-level RBAC check: verify room permissions in DB
        const room = await Room.findById(roomId);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          callback?.({ success: false, message: 'Room not found' });
          return;
        }

        if (socket.user.role !== 'admin' && !room.allowedRoles.includes(socket.user.role)) {
          const errMsg = `Access denied. Role '${socket.user.role}' cannot access room '${room.name}'`;
          socket.emit('error', { message: errMsg });
          callback?.({ success: false, message: errMsg });
          return;
        }

        // Verify channelId actually belongs to this roomId
        const channel = await Channel.findById(channelId);
        if (!channel || channel.roomId.toString() !== roomId) {
          const errMsg = 'Channel does not belong to this room';
          socket.emit('error', { message: errMsg });
          callback?.({ success: false, message: errMsg });
          return;
        }

        // C4: Auto-leave previous channel socket rooms
        const currentPresence = presenceStore.getUser(userId);
        if (currentPresence?.currentChannelId) {
          socket.leave(`channel:${currentPresence.currentChannelId}`);
        }

        socket.join(`channel:${channelId}`);

        const status = isVoice ? 'in-call' : 'online';
        presenceStore.updateChannel(userId, roomId, channelId, channelName, status);

        io.emit('presence:sync', presenceStore.getAllPresences());

        socket.to(`channel:${channelId}`).emit('channel:user_joined', {
          user: socket.user,
          channelId,
          status,
        });

        console.log(`[Socket] ${socket.user.name} joined channel ${channelName || channelId} (${status})`);
        callback?.({ success: true, data: { roomId, channelId, status } });
      } catch (err: any) {
        socket.emit('error', { message: 'Error joining channel' });
        callback?.({ success: false, message: 'Error joining channel' });
      }
    });

    socket.on('channel:leave', (data: { channelId: string }, callback?: AckCallback) => {
      socket.leave(`channel:${data.channelId}`);
      presenceStore.updateChannel(userId, undefined, undefined, undefined, 'online');
      io.emit('presence:sync', presenceStore.getAllPresences());
      callback?.({ success: true });
    });

    // --- Chat Messaging & Validation / Sanitization (E1, E2, E3) ---
    socket.on('chat:send_message', async (data: { channelId: string; content: string }, callback?: AckCallback) => {
      try {
        if (!socket.user) {
          callback?.({ success: false, message: 'Unauthenticated socket' });
          return;
        }

        if (!data.content || !data.content.trim()) {
          const errMsg = 'Message content cannot be empty';
          socket.emit('error', { message: errMsg });
          callback?.({ success: false, message: errMsg });
          return;
        }

        // E1: Verify user has channel membership/room access before broadcasting
        const channel = await Channel.findById(data.channelId);
        if (!channel) {
          socket.emit('error', { message: 'Channel not found' });
          callback?.({ success: false, message: 'Channel not found' });
          return;
        }

        const room = await Room.findById(channel.roomId);
        if (!room || (socket.user.role !== 'admin' && !room.allowedRoles.includes(socket.user.role))) {
          const errMsg = 'Access denied to message in this channel';
          socket.emit('error', { message: errMsg });
          callback?.({ success: false, message: errMsg });
          return;
        }

        // E3: Sanitize XSS payload
        const sanitizedContent = sanitizeText(data.content);
        if (!sanitizedContent) {
          const errMsg = 'Invalid message content';
          socket.emit('error', { message: errMsg });
          callback?.({ success: false, message: errMsg });
          return;
        }

        const newMessage = await Message.create({
          channelId: data.channelId,
          senderId: socket.user.id,
          senderName: socket.user.name,
          senderAvatar: socket.user.avatar,
          content: sanitizedContent,
        });

        io.to(`channel:${data.channelId}`).emit('chat:new_message', newMessage);
        callback?.({ success: true, data: newMessage });
      } catch (err: any) {
        console.error('[Socket] Error saving chat message:', err);
        socket.emit('error', { message: 'Failed to send message' });
        callback?.({ success: false, message: 'Failed to send message' });
      }
    });

    // --- Admin Forced Move ("Drag & Drop") (D2, D3) ---
    socket.on(
      'admin:force_move_user',
      async (data: { targetUserId: string; targetRoomId: string; targetChannelId: string; targetChannelName: string }, callback?: AckCallback) => {
        // D3: Verify emitting user is actual Admin
        if (socket.user?.role !== 'admin') {
          const errMsg = 'Only admins can perform forced channel migration';
          socket.emit('error', { message: errMsg });
          callback?.({ success: false, message: errMsg });
          return;
        }

        const { targetUserId, targetRoomId, targetChannelId, targetChannelName } = data;

        // D2: Check if target user exists
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
          const errMsg = 'Target user does not exist';
          socket.emit('error', { message: errMsg });
          callback?.({ success: false, message: errMsg });
          return;
        }

        console.log(`[Admin Move] Admin ${socket.user.name} moving user ${targetUser.name} (${targetUserId}) to channel ${targetChannelName}`);

        // Emit targeted event to target user's socket room
        io.to(`user:${targetUserId}`).emit('user:force_switch_channel', {
          targetRoomId,
          targetChannelId,
          targetChannelName,
          movedBy: socket.user.name,
        });

        callback?.({ success: true, message: `Moved user ${targetUser.name} to ${targetChannelName}` });
      }
    );

    // --- Private Breakout Mini-Meetings (F1) ---
    socket.on('admin:create_breakout', (data: { memberIds: string[]; breakoutName?: string }, callback?: AckCallback) => {
      if (socket.user?.role !== 'admin') {
        const errMsg = 'Only admins can create breakout rooms';
        socket.emit('error', { message: errMsg });
        callback?.({ success: false, message: errMsg });
        return;
      }

      const { memberIds, breakoutName } = data;
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        const errMsg = 'Breakout requires at least one target user';
        socket.emit('error', { message: errMsg });
        callback?.({ success: false, message: errMsg });
        return;
      }

      const breakoutId = `breakout_${Date.now()}`;
      const name = breakoutName || `Breakout Meeting #${Math.floor(Math.random() * 1000)}`;

      // F1: Filter out offline users gracefully
      const onlineMembers: string[] = [];
      const offlineMembers: string[] = [];

      memberIds.forEach((targetUserId) => {
        const presence = presenceStore.getUser(targetUserId);
        if (presence && presence.socketIds.size > 0) {
          onlineMembers.push(targetUserId);
        } else {
          offlineMembers.push(targetUserId);
        }
      });

      // Always include admin in breakout member list
      if (!onlineMembers.includes(socket.user.id)) {
        onlineMembers.push(socket.user.id);
      }

      activeBreakouts.set(breakoutId, {
        name,
        memberIds: new Set(onlineMembers),
      });

      console.log(`[Breakout] Created '${name}' (${breakoutId}). Online invited users: ${onlineMembers.length}, Offline skipped: ${offlineMembers.length}`);

      // Notify online members
      onlineMembers.forEach((targetUserId) => {
        io.to(`user:${targetUserId}`).emit('breakout:invited', {
          breakoutId,
          breakoutName: name,
          createdBy: socket.user?.name,
          invitedMembers: onlineMembers,
        });
      });

      if (offlineMembers.length > 0) {
        socket.emit('info', { message: `${offlineMembers.length} invited user(s) were offline and skipped` });
      }

      callback?.({ success: true, data: { breakoutId, breakoutName: name, onlineMembers, offlineMembers } });
    });

    socket.on('admin:invite_to_breakout', (data: { breakoutId: string; memberIds: string[] }, callback?: AckCallback) => {
      if (socket.user?.role !== 'admin') {
        const errMsg = 'Only admins can add members to breakout meetings';
        socket.emit('error', { message: errMsg });
        callback?.({ success: false, message: errMsg });
        return;
      }

      const { breakoutId, memberIds } = data;
      const breakout = activeBreakouts.get(breakoutId);
      if (!breakout) {
        const errMsg = 'Breakout meeting not found';
        socket.emit('error', { message: errMsg });
        callback?.({ success: false, message: errMsg });
        return;
      }

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        const errMsg = 'Please select at least one member to invite';
        socket.emit('error', { message: errMsg });
        callback?.({ success: false, message: errMsg });
        return;
      }

      const newlyInvited: string[] = [];

      memberIds.forEach((targetUserId) => {
        breakout.memberIds.add(targetUserId);
        const presence = presenceStore.getUser(targetUserId);
        if (presence && presence.socketIds.size > 0) {
          newlyInvited.push(targetUserId);
          io.to(`user:${targetUserId}`).emit('breakout:invited', {
            breakoutId,
            breakoutName: breakout.name,
            createdBy: socket.user?.name,
            invitedMembers: Array.from(breakout.memberIds),
          });
        }
      });

      console.log(`[Breakout] Admin ${socket.user.name} added ${newlyInvited.length} member(s) to '${breakout.name}' (${breakoutId})`);

      callback?.({
        success: true,
        message: `Invited ${newlyInvited.length} member(s) to meeting`,
        data: { breakoutId, newlyInvited },
      });
    });

    // --- WebRTC Signaling & Breakout Authorization (F2) ---
    socket.on('webrtc:join_voice_room', async (data: { channelId: string; breakoutId?: string }, callback?: AckCallback) => {
      try {
        const { channelId, breakoutId } = data;
        if (!socket.user) {
          callback?.({ success: false, message: 'Unauthenticated socket' });
          return;
        }

        if (breakoutId) {
          // Breakout case
          const breakout = activeBreakouts.get(breakoutId);
          if (!breakout || !breakout.memberIds.has(socket.user.id)) {
            const errMsg = 'Not authorized to join this breakout meeting';
            socket.emit('error', { message: errMsg });
            callback?.({ success: false, message: errMsg });
            return;
          }
        } else {
          // Regular voice channel - verify room access via channel -> room lookup
          const channel = await Channel.findById(channelId);
          if (!channel) {
            socket.emit('error', { message: 'Channel not found' });
            callback?.({ success: false, message: 'Channel not found' });
            return;
          }
          const room = await Room.findById(channel.roomId);
          if (!room || (socket.user.role !== 'admin' && !room.allowedRoles.includes(socket.user.role))) {
            const errMsg = 'Access denied to voice channel';
            socket.emit('error', { message: errMsg });
            callback?.({ success: false, message: errMsg });
            return;
          }
        }

        const roomKey = breakoutId ? `breakout:${breakoutId}` : `voice:${channelId}`;
        socket.join(roomKey);

        if (breakoutId) {
          const breakout = activeBreakouts.get(breakoutId);
          presenceStore.updateChannel(socket.user.id, undefined, undefined, breakout?.name || 'Private Breakout', 'in-breakout');
        } else if (channelId) {
          const channel = await Channel.findById(channelId);
          if (channel) {
            presenceStore.updateChannel(socket.user.id, channel.roomId.toString(), channel._id.toString(), channel.name, 'in-call');
          }
        }
        io.emit('presence:sync', presenceStore.getAllPresences());

        const existingParticipants = Array.from(io.sockets.adapter.rooms.get(roomKey) || [])
          .filter((id) => id !== socket.id);

        socket.to(roomKey).emit('webrtc:user_connected', {
          socketId: socket.id,
          user: socket.user,
        });

        callback?.({ success: true, data: { roomKey, existingParticipants } });
      } catch (err) {
        socket.emit('error', { message: 'Error joining voice room' });
        callback?.({ success: false, message: 'Error joining voice room' });
      }
    });

    socket.on('webrtc:leave_voice_room', (data: { channelId?: string; breakoutId?: string; roomKey?: string }, callback?: AckCallback) => {
      if (socket.user) {
        const roomKey = data.roomKey || (data.breakoutId ? `breakout:${data.breakoutId}` : `voice:${data.channelId}`);
        if (roomKey) {
          socket.leave(roomKey);
          socket.to(roomKey).emit('webrtc:user_disconnected', { socketId: socket.id, userId: socket.user.id });
        }
        presenceStore.updateChannel(socket.user.id, undefined, undefined, undefined, 'online');
        io.emit('presence:sync', presenceStore.getAllPresences());
      }
      callback?.({ success: true });
    });

    socket.on('webrtc:signal', (data: { targetSocketId: string; signal: any; breakoutId?: string; channelId?: string }, callback?: AckCallback) => {
      const { targetSocketId, signal, breakoutId, channelId } = data;

      if (breakoutId) {
        const breakout = activeBreakouts.get(breakoutId);
        if (!breakout || !breakout.memberIds.has(socket.user?.id || '')) {
          const errMsg = 'Not authorized to send WebRTC signals in this breakout';
          socket.emit('error', { message: errMsg });
          callback?.({ success: false, message: errMsg });
          return;
        }
      }

      // Verify sender is in the call room
      const roomKey = breakoutId ? `breakout:${breakoutId}` : `voice:${channelId}`;
      if (!socket.rooms.has(roomKey)) {
        const errMsg = 'You are not part of this call';
        socket.emit('error', { message: errMsg });
        callback?.({ success: false, message: errMsg });
        return;
      }

      // Verify target socket is also in the same room
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (!targetSocket || !targetSocket.rooms.has(roomKey)) {
        const errMsg = 'Target user is not in this call';
        socket.emit('error', { message: errMsg });
        callback?.({ success: false, message: errMsg });
        return;
      }

      io.to(targetSocketId).emit('webrtc:signal_received', {
        senderSocketId: socket.id,
        signal,
        user: socket.user,
      });

      callback?.({ success: true });
    });

    // --- Disconnect & Multi-Tab Handling (C1, C2, C3) ---
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Client disconnected (${reason}): ${socket.user?.name} (${socket.id})`);

      // Notify voice/breakout room peers before tearing down socket
      socket.rooms.forEach((room) => {
        if (room.startsWith('voice:') || room.startsWith('breakout:')) {
          socket.to(room).emit('webrtc:user_disconnected', { socketId: socket.id, userId: socket.user?.id });
        }
      });

      const { isFullyOffline } = presenceStore.removeSocket(socket.id);

      if (isFullyOffline) {
        console.log(`[Presence] User ${socket.user?.name} is now FULLY OFFLINE (all tabs closed)`);
        io.emit('presence:sync', presenceStore.getAllPresences());
      } else {
        console.log(`[Presence] User ${socket.user?.name} closed 1 tab (other tabs still connected)`);
      }
    });
  });
};
