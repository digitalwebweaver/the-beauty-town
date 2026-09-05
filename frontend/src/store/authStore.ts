import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/axios';
import type { User } from '@/types';

// The API mixes camelCase (fresh from our own handlers) and snake_case
// (columns returned verbatim by an older query) across endpoints — this
// covers both shapes for whichever one a given response used.
interface RawUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: User['role'];
  avatarUrl?: string | null;
  avatar_url?: string | null;
  notificationPrefs?: User['notificationPrefs'];
  notification_prefs?: User['notificationPrefs'];
  createdAt?: string;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;

  bootstrap: () => Promise<void>;
  passwordLogin: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<User>;
  requestOtp: (email: string, name?: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<User>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (email: string, otp: string, newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  googleLogin: (idToken: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<User>) => void;
}

function toUser(raw: RawUser): User {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone ?? undefined,
    role: raw.role,
    avatarUrl: raw.avatarUrl ?? raw.avatar_url ?? undefined,
    notificationPrefs: raw.notificationPrefs ?? raw.notification_prefs ?? undefined,
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      loading: true,

      bootstrap: async () => {
        try {
          const { data } = await api.get('/auth/me');
          const user = toUser(data.data.user);
          set({ user, isAuthenticated: true, loading: false });
        } catch {
          set({ user: null, isAuthenticated: false, loading: false });
        }
      },

      passwordLogin: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        const user = toUser(data.data.user);
        set({ user, isAuthenticated: true, loading: false });
        return user;
      },

      register: async (name, email, password, phone) => {
        const { data } = await api.post('/auth/register', {
          name,
          email,
          password,
          phone,
        });
        const user = toUser(data.data.user);
        set({ user, isAuthenticated: true, loading: false });
        return user;
      },

      requestOtp: async (email, name) => {
        await api.post('/auth/otp/request', { email, name });
      },

      verifyOtp: async (email, otp) => {
        const { data } = await api.post('/auth/otp/verify', { email, otp });
        const user = toUser(data.data.user);
        set({ user, isAuthenticated: true, loading: false });
        return user;
      },

      requestPasswordReset: async (email) => {
        await api.post('/auth/password-reset/request', { email });
      },

      confirmPasswordReset: async (email, otp, newPassword) => {
        await api.post('/auth/password-reset/confirm', { email, otp, newPassword });
      },

      changePassword: async (currentPassword, newPassword) => {
        const { data } = await api.post('/auth/change-password', {
          currentPassword,
          newPassword,
        });
        const user = toUser(data.data.user);
        set({ user, isAuthenticated: true, loading: false });
      },

      googleLogin: async (idToken) => {
        const { data } = await api.post('/auth/google', { idToken });
        const user = toUser(data.data.user);
        set({ user, isAuthenticated: true, loading: false });
        return user;
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          /* ignore */
        }
        set({ user: null, isAuthenticated: false });
      },

      updateProfile: (patch) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...patch } });
      },
    }),
    {
      name: 'salon-auth',
      partialize: (s) => ({
        user: s.user,
        isAuthenticated: s.isAuthenticated,
      }),
    }
  )
);
