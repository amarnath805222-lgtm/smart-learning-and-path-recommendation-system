import { create } from 'zustand';
import { authAPI, studentAPI } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  token: localStorage.getItem('access_token'),
  isLoading: false,
  isAuthenticated: !!localStorage.getItem('access_token'),
  error: null,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authAPI.login({ email, password });
      const { access_token, user } = res.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ token: access_token, user, isAuthenticated: true, isLoading: false });
      return { success: true, user };
    } catch (err) {
      const error = err.response?.data?.detail || 'Login failed';
      set({ error, isLoading: false });
      return { success: false, error };
    }
  },

  register: async (fullName, email, password) => {
    set({ isLoading: true, error: null });
    try {
      await authAPI.register({ full_name: fullName, email, password });
      // Do not directly login after registration: user must sign in manually
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const error = err.response?.data?.detail || 'Registration failed';
      set({ error, isLoading: false });
      return { success: false, error };
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    set({ token: null, user: null, profile: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    try {
      const res = await studentAPI.getProfile();
      set({ profile: res.data, user: res.data.user });
      return res.data;
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      return null;
    }
  },

  updateProfile: async (data) => {
    try {
      await studentAPI.updateProfile(data);
      await get().fetchProfile();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Update failed' };
    }
  },

  // Initialize from localStorage
  init: async () => {
    const token = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        set({ user: JSON.parse(savedUser), isAuthenticated: true });
        // Verify token is still valid
        const res = await authAPI.me();
        set({ user: res.data });
      } catch {
        // Token expired
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        set({ isAuthenticated: false, user: null });
      }
    }
  },
}));

export default useAuthStore;
