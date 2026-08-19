import { create } from 'zustand';
import api, { TOKEN_STORAGE_KEY } from '../services/api';
import { socketService } from '../services/socket';

export type UserRole = 'admin' | 'mern-dev' | 'php-dev' | 'common';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  status: 'online' | 'offline' | 'in-call';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem(TOKEN_STORAGE_KEY),
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;

      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      socketService.connect();

      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  register: async (name, email, password, role) => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.post('/auth/register', { name, email, password, role });
      const { token, user } = response.data;

      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      socketService.connect();

      set({
        token,
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed.';
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    socketService.disconnect();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  checkAuth: async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    try {
      set({ isLoading: true });
      const response = await api.get('/auth/me');
      const { user } = response.data;

      socketService.connect();

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      socketService.disconnect();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
