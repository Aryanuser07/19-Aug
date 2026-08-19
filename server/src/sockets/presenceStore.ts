import { UserRole } from '../models/User';

export interface UserPresence {
  userId: string;
  userName: string;
  userEmail: string;
  avatar?: string;
  role: UserRole;
  socketIds: Set<string>;
  status: 'online' | 'in-call' | 'in-breakout';
  currentRoomId?: string;
  currentChannelId?: string;
  currentChannelName?: string;
  breakoutRoomId?: string;
  joinedAt: Date;
}

export interface UserPresenceDTO {
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
  joinedAt: Date;
}

class PresenceStore {
  private activeUsers: Map<string, UserPresence> = new Map(); // userId -> UserPresence

  public addSocket(userId: string, socketId: string, userInfo: { name: string; email: string; avatar?: string; role: UserRole }): UserPresence {
    let presence = this.activeUsers.get(userId);

    if (!presence) {
      presence = {
        userId,
        userName: userInfo.name,
        userEmail: userInfo.email,
        avatar: userInfo.avatar,
        role: userInfo.role,
        socketIds: new Set([socketId]),
        status: 'online',
        joinedAt: new Date(),
      };
    } else {
      presence.socketIds.add(socketId);
      // Preserve currentRoom/Channel if re-connecting in new tab
    }

    this.activeUsers.set(userId, presence);
    return presence;
  }

  public removeSocket(socketId: string): { user: UserPresence | undefined; isFullyOffline: boolean } {
    for (const [userId, presence] of this.activeUsers.entries()) {
      if (presence.socketIds.has(socketId)) {
        presence.socketIds.delete(socketId);

        if (presence.socketIds.size === 0) {
          this.activeUsers.delete(userId);
          return { user: presence, isFullyOffline: true };
        } else {
          return { user: presence, isFullyOffline: false };
        }
      }
    }
    return { user: undefined, isFullyOffline: false };
  }

  public getUser(userId: string): UserPresence | undefined {
    return this.activeUsers.get(userId);
  }

  public updateChannel(userId: string, roomId?: string, channelId?: string, channelName?: string, status: 'online' | 'in-call' | 'in-breakout' = 'online'): UserPresence | undefined {
    const user = this.activeUsers.get(userId);
    if (user) {
      user.currentRoomId = roomId || undefined;
      user.currentChannelId = channelId || undefined;
      user.currentChannelName = channelName || undefined;
      user.status = status;
      this.activeUsers.set(userId, user);
    }
    return user;
  }

  public getAllPresences(): UserPresenceDTO[] {
    return Array.from(this.activeUsers.values()).map((p) => ({
      userId: p.userId,
      userName: p.userName,
      userEmail: p.userEmail,
      avatar: p.avatar,
      role: p.role,
      connectionCount: p.socketIds.size,
      status: p.status,
      currentRoomId: p.currentRoomId,
      currentChannelId: p.currentChannelId,
      currentChannelName: p.currentChannelName,
      breakoutRoomId: p.breakoutRoomId,
      joinedAt: p.joinedAt,
    }));
  }
}

export const presenceStore = new PresenceStore();
