import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { dashboardApi, MOCK_DASHBOARD } from '../services/api';
import { DashboardData } from '../types';

export const useDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const navigation = useNavigation();
  const errorLoggedRef = useRef(false);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const dashboardData = await dashboardApi.getDashboard();
      setData(dashboardData);
      setIsOffline(false);
      errorLoggedRef.current = false;
    } catch (err: any) {
      // Only log once to avoid console spam
      if (!errorLoggedRef.current) {
        console.warn('Dashboard fetch failed, using offline data:', err?.message);
        errorLoggedRef.current = true;
      }

      // Gracefully fall back to mock/cached data so the app is still usable
      setData((prev) => prev || MOCK_DASHBOARD);
      setIsOffline(true);
      setError('Using offline data — backend unreachable');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboard(true);
    });
    return unsubscribe;
  }, [navigation, fetchDashboard]);

  const refresh = () => fetchDashboard(true);

  return { data, isLoading, isRefreshing, error, isOffline, refresh };
};
