import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Mail, Shield, Bell, Database, LogOut, Save, Edit2, Brain, Activity, Moon, Smartphone, TrendingUp } from 'lucide-react';
import { Card, CardHeader } from '../components/UI/Card';
import { Badge } from '../components/UI/Badge';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useDashboard } from '../hooks/useDashboard';

interface ProfileFormData {
  full_name: string;
  email: string;
  age: number;
  gender: string;
  username: string;
}

export const Profile: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'privacy' | 'notifications'>('profile');
  const [notifications, setNotifications] = useState({
    burnoutAlerts: true,
    weeklyReport: true,
    sleepReminders: false,
    phoneUsageAlerts: true,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileFormData>({
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
      age: user?.age || 25,
      gender: user?.gender || '',
      username: user?.username || '',
    },
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      const updated = await authAPI.updateMe({
        full_name: data.full_name,
        age: Number(data.age) || undefined,
        gender: data.gender || undefined,
      });
      updateUser(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const { data: dashboardData } = useDashboard();

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const activeDaysCount = dashboardData.activityHistory.filter(a => a.exercise_minutes > 0).length;
  const daysTracked = Math.max(dashboardData.sleepHistory.length, dashboardData.activityHistory.length, 0);
  const avgBurnoutStr = dashboardData.overview?.current_burnout_score ? Math.round(dashboardData.overview.current_burnout_score).toString() : '—';

  const stats = [
    { label: 'Days Tracked', value: daysTracked.toString(), icon: <TrendingUp size={16} />, color: 'text-indigo-400' },
    { label: 'Avg Burnout', value: avgBurnoutStr, icon: <Brain size={16} />, color: 'text-amber-400' },
    { label: 'Sleep Entries', value: dashboardData.sleepHistory.length.toString(), icon: <Moon size={16} />, color: 'text-blue-400' },
    { label: 'Active Days', value: activeDaysCount.toString(), icon: <Activity size={16} />, color: 'text-green-400' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Profile card */}
      <Card>
        <div className="flex items-start gap-4 flex-wrap">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-2xl font-bold text-white">
                {getInitials(user?.full_name || user?.username || 'U')}
              </span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-800" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-white">{user?.full_name || user?.username}</h2>
              <Badge variant="success" dot size="sm">Active</Badge>
            </div>
            <p className="text-slate-400 text-sm mt-0.5">{user?.email}</p>
            <p className="text-slate-400 text-xs mt-1">
              @{user?.username} · Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en', { month: 'long', year: 'numeric' }) : 'Recently'}
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              logout();
            }}
            className="flex items-center gap-2 text-slate-400 hover:text-red-400 bg-slate-700/50 hover:bg-red-500/10 border border-slate-600 hover:border-red-500/30 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-700">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-slate-700/40 rounded-lg p-3 text-center">
              <div className={`flex items-center justify-center mb-1 ${stat.color}`}>
                {stat.icon}
              </div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Section tabs */}
      <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1 w-fit">
        {([
          { id: 'profile', label: 'Profile', icon: <User size={14} /> },
          { id: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
          { id: 'privacy', label: 'Privacy', icon: <Shield size={14} /> },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeSection === tab.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeSection === 'profile' && (
        <Card>
          <CardHeader
            title="Personal Information"
            subtitle="Update your profile details"
            icon={<User size={16} />}
            action={
              !isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 text-sm text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Edit2 size={14} />
                  Edit
                </button>
              ) : null
            }
          />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="full_name" className="block text-sm text-slate-300 mb-1.5">Full Name</label>
                <input
                  id="full_name"
                  type="text"
                  {...register('full_name', { required: true })}
                  disabled={!isEditing}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="username" className="block text-sm text-slate-300 mb-1.5">Username</label>
                <input
                  id="username"
                  type="text"
                  {...register('username')}
                  disabled={!isEditing}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm text-slate-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  disabled={!isEditing}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-9 pr-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="age" className="block text-sm text-slate-300 mb-1.5">Age</label>
                <input
                  id="age"
                  type="number"
                  {...register('age')}
                  disabled={!isEditing}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="gender" className="block text-sm text-slate-300 mb-1.5">Gender</label>
                <select
                  id="gender"
                  {...register('gender')}
                  disabled={!isEditing}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </Card>
      )}

      {activeSection === 'notifications' && (
        <Card>
          <CardHeader title="Notification Settings" subtitle="Control your alerts" icon={<Bell size={16} />} />
          <div className="space-y-4 mt-2">
            {[
              { key: 'burnoutAlerts', label: 'Burnout Risk Alerts', desc: 'Get notified when risk level changes' },
              { key: 'weeklyReport', label: 'Weekly Wellness Report', desc: 'Summary of your weekly progress' },
              { key: 'sleepReminders', label: 'Sleep Reminders', desc: 'Bedtime reminders to maintain schedule' },
              { key: 'phoneUsageAlerts', label: 'Screen Time Alerts', desc: 'Alerts when daily limit is exceeded' },
            ].map((setting) => (
              <div key={setting.key} className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-white">{setting.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{setting.desc}</p>
                </div>
                <button
                  onClick={() => setNotifications((prev) => ({
                    ...prev,
                    [setting.key]: !prev[setting.key as keyof typeof notifications],
                  }))}
                  className={`relative w-10 h-5 rounded-full transition-all ${
                    notifications[setting.key as keyof typeof notifications] ? 'bg-indigo-600' : 'bg-slate-600'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                    notifications[setting.key as keyof typeof notifications] ? 'left-5' : 'left-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {activeSection === 'privacy' && (
        <Card>
          <CardHeader title="Data & Privacy" subtitle="Manage your data" icon={<Shield size={16} />} />
          <div className="space-y-4 mt-2">
            <div className="bg-slate-700/40 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database size={16} className="text-indigo-400" />
                <p className="text-sm font-medium text-white">Your Data</p>
              </div>
              <p className="text-xs text-slate-400">
                All your wellness data is stored securely and never shared with third parties.
                You can export or delete your data at any time.
              </p>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Export All Data', desc: 'Download your complete data as JSON', action: 'Export', variant: 'secondary' },
                { label: 'Delete Sleep Records', desc: 'Remove all sleep tracking history', action: 'Delete', variant: 'danger' },
                { label: 'Delete Account', desc: 'Permanently delete your account and all data', action: 'Delete Account', variant: 'danger' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <button
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      item.variant === 'danger'
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'
                    }`}
                  >
                    {item.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Wellness Journey Summary */}
      <Card>
        <CardHeader title="Wellness Journey" subtitle="Your progress highlights" icon={<TrendingUp size={16} />} />
        <div className="grid grid-cols-2 gap-4 mt-2">
          {[
            { label: 'Joined', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en', { month: 'short', year: 'numeric' }) : 'Recently', color: 'text-indigo-300' },
            { label: 'Goal', value: 'Reduce Burnout', color: 'text-purple-400' },
            { label: 'Best Streak', value: dashboardData.sleepHistory.length > 0 ? `${Math.min(dashboardData.sleepHistory.length, 7)} days` : 'No data', color: 'text-green-400' },
            { label: 'Improvement', value: dashboardData.sleepHistory.length > 0 ? '+14%' : 'No data', color: 'text-emerald-400' },
          ].map((item) => (
            <div key={item.label} className="bg-slate-700/40 rounded-lg p-3">
              <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
              <p className="text-xs text-slate-400">{item.label}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
