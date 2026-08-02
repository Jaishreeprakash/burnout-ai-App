import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Moon,
  Smartphone,
  Heart,
  Activity,
  Lightbulb,
  BarChart2,
  User,
  LogOut,
  Brain,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { path: '/sleep', label: 'Sleep Tracker', icon: <Moon size={18} /> },
  { path: '/phone', label: 'Phone Usage', icon: <Smartphone size={18} /> },
  { path: '/emotions', label: 'Emotion Analysis', icon: <Heart size={18} /> },
  { path: '/activity', label: 'Activity Tracker', icon: <Activity size={18} /> },
  { path: '/recommendations', label: 'Recommendations', icon: <Lightbulb size={18} /> },
  { path: '/analytics', label: 'Analytics', icon: <BarChart2 size={18} /> },
  { path: '/chat', label: 'AI Coach Chat', icon: <Brain size={18} /> },
  { path: '/profile', label: 'Profile', icon: <User size={18} /> },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-0 h-full bg-[#0b1120] border-r border-slate-800 z-30 flex flex-col transition-all duration-300',
          'lg:relative lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className={clsx(
          'flex items-center h-16 border-b border-slate-800 flex-shrink-0 px-4',
          collapsed ? 'justify-center' : 'justify-between'
        )}>
          <div className={clsx('flex items-center gap-2.5', collapsed && 'justify-center')}>
            <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
              <img src={logo} alt="BurnoutAI Logo" className="w-full h-full object-cover" />
            </div>
            {!collapsed && (
              <span className="text-lg font-bold text-white tracking-tight">
                Burnout<span className="text-indigo-400">AI</span>
              </span>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={onClose}
              aria-label="Close sidebar"
              className="lg:hidden text-slate-400 hover:text-white p-1"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {!collapsed && (
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider px-3 mb-2">
              Menu
            </p>
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => onClose()}
              className={({ isActive }) =>
                clsx(
                  'flex items-center rounded-lg transition-all duration-150 cursor-pointer text-sm font-medium',
                  collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="flex-shrink-0 border-t border-slate-800 p-3">
          {!collapsed && user && (
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-white">
                  {getInitials(user.full_name || user.username)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.full_name || user.username}
                </p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          )}

          <div className={clsx('flex', collapsed ? 'flex-col gap-1' : 'items-center gap-2')}>
            <button
              onClick={handleLogout}
              aria-label="Logout"
              className={clsx(
                'flex items-center gap-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-150 text-sm',
                collapsed ? 'p-2.5 justify-center w-full' : 'px-3 py-2 flex-1'
              )}
              title={collapsed ? 'Logout' : undefined}
            >
              <LogOut size={16} />
              {!collapsed && <span>Logout</span>}
            </button>

            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden lg:flex items-center justify-center p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
