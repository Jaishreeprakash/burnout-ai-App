import { User, Token } from '../types';

const TOKEN_KEY = 'access_token';
const USER_KEY = 'user';

export const authStorage = {
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken: (): void => {
    localStorage.removeItem(TOKEN_KEY);
  },

  getUser: (): User | null => {
    const userData = localStorage.getItem(USER_KEY);
    if (userData) {
      try {
        return JSON.parse(userData) as User;
      } catch {
        return null;
      }
    }
    return null;
  },

  setUser: (user: User): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  removeUser: (): void => {
    localStorage.removeItem(USER_KEY);
  },

  saveAuth: (token: Token, user: User): void => {
    authStorage.setToken(token.access_token);
    authStorage.setUser(user);
  },

  clearAuth: (): void => {
    authStorage.removeToken();
    authStorage.removeUser();
  },

  isAuthenticated: (): boolean => {
    return !!authStorage.getToken();
  },
};

export default authStorage;
