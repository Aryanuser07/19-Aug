import { io, Socket } from 'socket.io-client';
import { TOKEN_STORAGE_KEY } from './api';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;

  public connect(): Socket {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    this.socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('📡 [Socket] Connected to server with ID:', this.socket?.id);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('⚠️ [Socket] Connection error:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 [Socket] Disconnected:', reason);
    });

    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  // Socket.io Acknowledgement promise wrapper with timeout protection
  public emitWithAck<T = any>(
    event: string,
    data?: any,
    timeoutMs = 8000
  ): Promise<{ success: boolean; message?: string; data?: T }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.socket.connected) {
        resolve({ success: false, message: 'Socket disconnected. Retrying...' });
        return;
      }

      const timer = setTimeout(() => {
        resolve({ success: false, message: 'Request timed out. Please try again.' });
      }, timeoutMs);

      this.socket.emit(event, data, (response: { success: boolean; message?: string; data?: T }) => {
        clearTimeout(timer);
        resolve(response || { success: true });
      });
    });
  }
}

export const socketService = new SocketService();
