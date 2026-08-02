import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useDashboard } from '../../hooks/useDashboard';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Your wellness overview at a glance' },
  '/sleep': { title: 'Sleep Tracker', subtitle: 'Monitor and improve your sleep patterns' },
  '/phone': { title: 'Phone Usage', subtitle: 'Track screen time and digital habits' },
  '/emotions': { title: 'Emotion Analysis', subtitle: 'Understand your emotional patterns' },
  '/activity': { title: 'Activity Tracker', subtitle: 'Monitor study, work and exercise balance' },
  '/recommendations': { title: 'AI Recommendations', subtitle: 'Personalized wellness insights' },
  '/analytics': { title: 'Analytics', subtitle: 'Deep dive into your wellness data' },
  '/chat': { title: 'AI Wellness Coach', subtitle: 'Chat with your personal GPT-powered coach' },
  '/profile': { title: 'Profile', subtitle: 'Manage your account settings' },
};

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { data } = useDashboard();

  const pageInfo = pageTitles[location.pathname] || { title: 'BurnoutAI', subtitle: '' };
  const riskLevel = data?.burnoutAnalysis?.risk_level;

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          riskLevel={riskLevel}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
