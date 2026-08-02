import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { SleepTracker } from './pages/SleepTracker';
import { PhoneUsage } from './pages/PhoneUsage';
import { EmotionAnalysis } from './pages/EmotionAnalysis';
import { ActivityTracker } from './pages/ActivityTracker';
import { Recommendations } from './pages/Recommendations';
import { Analytics } from './pages/Analytics';
import { Profile } from './pages/Profile';
import { WellnessChat } from './pages/WellnessChat';
import { LoadingSpinner } from './components/UI/LoadingSpinner';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner size="xl" label="Loading BurnoutAI..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="sleep" element={<SleepTracker />} />
        <Route path="phone" element={<PhoneUsage />} />
        <Route path="emotions" element={<EmotionAnalysis />} />
        <Route path="activity" element={<ActivityTracker />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="chat" element={<WellnessChat />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
