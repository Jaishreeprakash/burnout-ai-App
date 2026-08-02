import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { dashboardApi } from '../services/api';
import { DashboardData } from '../types';

export const useDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();

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
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard fetch error:', err);
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

  return { data, isLoading, isRefreshing, error, refresh };
};
