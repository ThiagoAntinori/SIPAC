import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try {
      const saved = localStorage.getItem('sipac_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })(),
  token: localStorage.getItem('sipac_token') || null,
  setAuth: (token, user) => {
    localStorage.setItem('sipac_token', token);
    localStorage.setItem('sipac_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('sipac_token');
    localStorage.removeItem('sipac_user');
    set({ token: null, user: null });
  },
  isAuthenticated: () => !!get().token,
}));
