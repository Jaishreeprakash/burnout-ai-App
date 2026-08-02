import React, { useState } from 'react';
import { Bell, Menu, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { RiskBadge } from '../UI/Badge';
import { RiskLevel } from '../../types';

interface HeaderProps {
  title: string;
  subtitle?: string;
  riskLevel?: RiskLevel;
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  riskLevel,
  onMenuClick,
}) => {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const notifications = [
    { id: 1, text: 'Your burnout risk increased to MODERATE', time: '2h ago', read: false },
    { id: 2, text: 'New recommendation available', time: '5h ago', read: false },
    { id: 3, text: 'Sleep quality below average this week', time: '1d ago', read: true },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-4 lg:px-6 gap-4 flex-shrink-0 sticky top-0 z-10">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Title */}
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-white leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-slate-400 hidden sm:block">{subtitle}</p>
        )}
      </div>

      {/* Date */}
      <div className="hidden md:flex items-center gap-2 text-sm text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-lg">
        <span>{format(new Date(), 'EEE, MMM d yyyy')}</span>
      </div>

      {/* Risk badge */}
      {riskLevel && (
        <div className="hidden sm:block">
          <RiskBadge level={riskLevel} />
        </div>
      )}

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          aria-label="Notifications"
          className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
              {unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50">
            <div className="p-3 border-b border-slate-700">
              <h3 className="font-semibold text-white text-sm">Notifications</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 border-b border-slate-700/50 last:border-0 ${
                    !notif.read ? 'bg-indigo-500/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!notif.read && (
                      <div className="w-2 h-2 bg-indigo-400 rounded-full mt-1.5 flex-shrink-0" />
                    )}
                    <div className={!notif.read ? '' : 'pl-4'}>
                      <p className="text-sm text-slate-300">{notif.text}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{notif.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2">
              <button
                onClick={() => setShowNotifications(false)}
                className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 py-1"
              >
                Mark all as read
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User avatar */}
      {user && (
        <div className="flex items-center gap-2 cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {getInitials(user.full_name || user.username)}
            </span>
          </div>
          <ChevronDown size={14} className="text-slate-400 hidden sm:block group-hover:text-slate-300 transition-colors" />
        </div>
      )}
    </header>
  );
};
