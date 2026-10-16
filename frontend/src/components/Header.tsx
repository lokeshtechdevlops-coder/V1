import React, { useState } from 'react';
import { AppRole, HospitalNotification } from '../types';

interface HeaderProps {
  currentRole: AppRole;
  onRoleChange: (role: AppRole) => void;
  onOpenMobileSidebar?: () => void;
  notifications: HospitalNotification[];
  onMarkNotificationsRead?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSwitchToAuthPortal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onRoleChange,
  onOpenMobileSidebar,
  notifications,
  onMarkNotificationsRead,
  searchQuery,
  onSearchChange,
  onSwitchToAuthPortal,
}) => {
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadCount = notifications.filter((n) => n.unread).length;

  // Role details
  const getRoleUser = () => {
    switch (currentRole) {
      case 'doctor':
        return {
          name: 'Dr. Sarah Lin, MD',
          title: 'Chief of Cardiology',
          initials: 'SL',
          color: 'bg-primary-container',
        };
      case 'patient':
        return {
          name: 'John Doe',
          title: 'Patient (MRN-90214)',
          initials: 'JD',
          color: 'bg-tertiary',
        };
      case 'admin':
        return {
          name: 'Marcus Vance',
          title: 'Chief Operations Officer',
          initials: 'MV',
          color: 'bg-secondary',
        };
      default:
        return {
          name: 'Dr. Aris Thorne',
          title: 'Chief Medical Officer',
          initials: 'AT',
          color: 'bg-primary',
        };
    }
  };

  const user = getRoleUser();

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 border-b border-surface-container-high/40">
      <div className="h-16 w-full px-4 sm:px-space-xl flex items-center justify-between gap-space-md">
        {/* Mobile menu trigger */}
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
          aria-label="Open sidebar"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              className="w-full h-9 pl-9 pr-space-md bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-container transition-all"
              placeholder="Search MRN, patient name, diagnosis, or agent order..."
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Right Actions Cluster */}
        <div className="flex items-center gap-space-sm sm:gap-space-md">
          {/* Role Switcher Pills */}
          <div className="hidden sm:flex items-center p-space-2xs bg-surface-container-low rounded-lg gap-space-2xs border border-surface-container-high/40">
            <span className="font-label-sm text-label-sm text-on-surface-variant px-space-xs font-semibold">
              ROLE:
            </span>
            <button
              onClick={() => onRoleChange('doctor')}
              className={`px-space-xs py-space-2xs rounded font-label-sm text-label-sm transition-all ${
                currentRole === 'doctor'
                  ? 'bg-surface-container-lowest text-primary shadow-[0_1px_2px_rgba(0,0,0,0.05)] font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              Doctor
            </button>
            <button
              onClick={() => onRoleChange('patient')}
              className={`px-space-xs py-space-2xs rounded font-label-sm text-label-sm transition-all ${
                currentRole === 'patient'
                  ? 'bg-surface-container-lowest text-primary shadow-[0_1px_2px_rgba(0,0,0,0.05)] font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              Patient
            </button>
            <button
              onClick={() => onRoleChange('admin')}
              className={`px-space-xs py-space-2xs rounded font-label-sm text-label-sm transition-all ${
                currentRole === 'admin'
                  ? 'bg-surface-container-lowest text-primary shadow-[0_1px_2px_rgba(0,0,0,0.05)] font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              Admin
            </button>
          </div>

          {/* Notifications Button & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
              type="button"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error animate-pulse"></span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container-high z-50 p-space-sm space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-surface-container-low px-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-label-sm bg-error-container text-on-error-container font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {onMarkNotificationsRead && (
                    <button
                      onClick={onMarkNotificationsRead}
                      className="text-label-sm text-primary hover:underline font-semibold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-2 rounded-lg text-left transition-colors flex items-start gap-2 ${
                        n.unread ? 'bg-surface-container-low/70' : 'hover:bg-surface-container-low'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          n.unread ? 'bg-primary' : 'bg-transparent'
                        }`}
                      ></span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-label-md text-label-md font-bold text-on-surface truncate">
                            {n.title}
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant shrink-0 ml-1">
                            {n.timeAgo}
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Badge & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-space-sm pl-space-xs hover:opacity-90 transition-opacity"
              type="button"
            >
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="font-label-lg text-label-lg text-on-surface font-bold leading-tight">
                  {user.name}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">
                  {user.title}
                </span>
              </div>
              <div
                className={`w-8 h-8 rounded-full ${user.color} flex items-center justify-center text-on-primary font-bold text-xs shadow-sm`}
              >
                {user.initials}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-surface-container-lowest rounded-xl shadow-xl border border-surface-container-high z-50 p-space-sm space-y-1">
                <div className="px-3 py-2 border-b border-surface-container-low">
                  <div className="font-label-lg font-bold text-on-surface">{user.name}</div>
                  <div className="text-label-sm text-on-surface-variant">{user.title}</div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] font-mono text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                    256-Bit TLS Active
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onRoleChange('doctor');
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-body-sm hover:bg-surface-container-low flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px] text-primary">stethoscope</span>
                  <span>Switch to Doctor View</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onRoleChange('patient');
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-body-sm hover:bg-surface-container-low flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px] text-tertiary">person</span>
                  <span>Switch to Patient View</span>
                </button>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onRoleChange('admin');
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-body-sm hover:bg-surface-container-low flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px] text-secondary">admin_panel_settings</span>
                  <span>Switch to Admin View</span>
                </button>

                <div className="border-t border-surface-container-low pt-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onSwitchToAuthPortal();
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-body-sm text-error hover:bg-error-container/40 flex items-center gap-2 font-medium"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    <span>Sign Out / Switch Portal</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
