import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

const KEYS = {
  TOKEN: '@burnout_token',
  USER: '@burnout_user',
  ONBOARDING: '@burnout_onboarding',
  SETTINGS: '@burnout_settings',
};

export const StorageService = {
  async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.TOKEN, token);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(KEYS.TOKEN);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.TOKEN);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },

  async saveUser(user: User): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user:', error);
    }
  },

  async getUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEYS.USER);
    } catch (error) {
      console.error('Error removing user:', error);
    }
  },

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([KEYS.TOKEN, KEYS.USER, KEYS.SETTINGS]);
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },

  async saveSettings(settings: Record<string, unknown>): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  },

  async getSettings(): Promise<Record<string, unknown> | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SETTINGS);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  },

  async setOnboardingComplete(): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.ONBOARDING, 'true');
    } catch (error) {
      console.error('Error setting onboarding:', error);
    }
  },

  async isOnboardingComplete(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(KEYS.ONBOARDING);
      return val === 'true';
    } catch (error) {
      return false;
    }
  },
};
