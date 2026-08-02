import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthState, LoginCredentials, RegisterData } from '../types';
import { authAPI } from '../services/api';
import { authStorage } from '../services/auth';

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // On app start — restore session from localStorage, then verify the token
  // is still valid by calling /auth/me. If the server rejects it (401/network error),
  // clear everything so the user sees the login page cleanly.
  useEffect(() => {
    const token = authStorage.getToken();
    const user  = authStorage.getUser();
    const isRealJWT = token && token.startsWith('eyJ');

    if (!isRealJWT || !user) {
      authStorage.clearAuth();
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    // Optimistically restore, then silently verify with the backend
    setState({ user, token, isAuthenticated: true, isLoading: false });

    authAPI.getMe()
      .then((freshUser) => {
        // Token still valid — update user info in case it changed
        authStorage.setUser(freshUser);
        setState({ user: freshUser, token, isAuthenticated: true, isLoading: false });
      })
      .catch(() => {
        // Token rejected (expired / server restarted with different key) — force re-login
        authStorage.clearAuth();
        setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
      });
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    try {
      // 1. Get token (backend login already returns the user inside the token response)
      const tokenData = await authAPI.login(credentials);

      // 2. Save token to localStorage IMMEDIATELY so subsequent API calls
      //    get the Authorization header via the axios interceptor
      authStorage.setToken(tokenData.access_token);

      // 3. Use the user embedded in the login response — avoids a second round-trip
      //    (and avoids the race where getMe fires before the token is stored)
      const user: User = tokenData.user ?? {
        id: 0,
        username: credentials.username,
        email: credentials.username,
        full_name: credentials.username,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      authStorage.setUser(user);
      setState({ user, token: tokenData.access_token, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      // Clean up any partial state
      authStorage.clearAuth();

      // Re-throw so the Login page can show the actual error message
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Login failed. Please check your credentials.';
      throw new Error(message);
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<void> => {
    try {
      const tokenData = await authAPI.register(data);

      // Save token first (same pattern as login)
      authStorage.setToken(tokenData.access_token);

      const user: User = tokenData.user ?? {
        id: 0,
        username: data.username,
        email: data.email,
        full_name: data.full_name,
        age: data.age,
        gender: data.gender,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      authStorage.setUser(user);
      setState({ user, token: tokenData.access_token, isAuthenticated: true, isLoading: false });
    } catch (err: unknown) {
      authStorage.clearAuth();
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Registration failed. Please try again.';
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(() => {
    authStorage.clearAuth();
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  }, []);

  const updateUser = useCallback((user: User) => {
    authStorage.setUser(user);
    setState((prev) => ({ ...prev, user }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
