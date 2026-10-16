import React from 'react';
import { AppRole } from '../types';

interface SidebarProps {
  currentRole: AppRole;
  onRoleChange: (role: AppRole) => void;
  activePath?: string;
  onNavigate?: (path: string) => void;
  onLaunchCopilot?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  onRoleChange,
  activePath = 'triage-console',
  onNavigate,
  onLaunchCopilot,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const handleNav = (path: string) => {
    if (onNavigate) onNavigate(path);
    if (path === 'patient-directory' || path === 'electronic-health-records') {
      if (currentRole !== 'doctor') onRoleChange('doctor');
    } else if (path === 'ai-agents-workspace' || path === 'decision-audit-logs') {
      if (currentRole !== 'admin') onRoleChange('admin');
    }
    if (onCloseMobile) onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between select-none bg-surface-container-lowest">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Logo & Brand Header */}
        <div className="h-16 flex items-center px-space-lg gap-space-sm bg-surface-container-lowest border-b border-surface-container-low">
          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center p-1 text-primary-container shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-primary-container" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="4" fill="#0369a1" />
              <path d="M12 7v10M7 12h10" stroke="#ffffff" strokeWidth="2.5" />
            </svg>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-headline-sm text-headline-sm text-on-surface truncate font-bold">CareNexus AI</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-space-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-container inline-block animate-pulse"></span>
              Autonomous Clinical Agent
            </span>
          </div>
        </div>

        {/* Engine Ready Badge */}
        <div className="px-space-md py-space-sm">
          <div className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container-low border border-surface-container-high/60">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px] text-primary-container">neurology</span>
              <span className="font-label-sm text-label-sm text-on-surface font-medium">Triage Agent Engine</span>
            </div>
            <span className="font-label-sm text-label-sm text-primary font-bold">99.8% READY</span>
          </div>
        </div>

        {/* Navigation Categories */}
        <nav className="flex-1 px-space-sm space-y-space-md py-space-xs">
          {/* Clinical Operations */}
          <div className="space-y-space-2xs">
            <div className="px-space-sm py-space-2xs font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              Clinical Operations
            </div>
            <button
              onClick={() => handleNav('triage-console')}
              className={`w-full text-left flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg transition-all ${
                activePath === 'triage-console'
                  ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">emergency</span>
              <span className="font-label-lg text-label-lg">Triage Console</span>
            </button>
            <button
              onClick={() => handleNav('patient-directory')}
              className={`w-full text-left flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg transition-all ${
                activePath === 'patient-directory'
                  ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">hotel</span>
              <span className="font-label-lg text-label-lg">Inpatient Ward</span>
            </button>
            <button
              onClick={() => handleNav('icu-telemetry')}
              className={`w-full text-left flex items-center justify-between px-space-sm py-space-xs rounded-lg transition-all ${
                activePath === 'icu-telemetry'
                  ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[18px]">vital_signs</span>
                <span className="font-label-lg text-label-lg">ICU Telemetry</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
            </button>
          </div>

          {/* Care Records */}
          <div className="space-y-space-2xs">
            <div className="px-space-sm py-space-2xs font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              Care Records
            </div>
            <button
              onClick={() => handleNav('electronic-health-records')}
              className={`w-full text-left flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg transition-all ${
                activePath === 'electronic-health-records'
                  ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">folder_shared</span>
              <span className="font-label-lg text-label-lg">Patient EHR</span>
            </button>
            <button
              onClick={() => handleNav('diagnostic-imaging')}
              className={`w-full text-left flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg transition-all ${
                activePath === 'diagnostic-imaging'
                  ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">radiology</span>
              <span className="font-label-lg text-label-lg">Radiology & Labs</span>
            </button>
            <button
              onClick={() => handleNav('prescriptions-pharmacy')}
              className={`w-full text-left flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg transition-all ${
                activePath === 'prescriptions-pharmacy'
                  ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">medication</span>
              <span className="font-label-lg text-label-lg">Pharmacy Queue</span>
            </button>
          </div>

          {/* Agentic Intelligence */}
          <div className="space-y-space-2xs">
            <div className="px-space-sm py-space-2xs font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              Agentic Intelligence
            </div>
            <button
              onClick={() => handleNav('ai-agents-workspace')}
              className={`w-full text-left flex items-center justify-between px-space-sm py-space-xs rounded-lg transition-all ${
                activePath === 'ai-agents-workspace'
                  ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                <span className="font-label-lg text-label-lg">Clinical Copilots</span>
              </div>
              <span className="font-label-sm text-label-sm bg-surface-container-high px-space-xs py-space-2xs rounded-full text-primary font-bold">
                3 Live
              </span>
            </button>
            <button
              onClick={() => handleNav('decision-audit-logs')}
              className={`w-full text-left flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg transition-all ${
                activePath === 'decision-audit-logs'
                  ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
              <span className="font-label-lg text-label-lg">Decision Audit</span>
            </button>
          </div>

          {/* System Management */}
          <div className="space-y-space-2xs">
            <div className="px-space-sm py-space-2xs font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              System Management
            </div>
            <button
              onClick={() => handleNav('staff-scheduling')}
              className={`w-full text-left flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg transition-all ${
                activePath === 'staff-scheduling'
                  ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">badge</span>
              <span className="font-label-lg text-label-lg">Staff On-Call</span>
            </button>
            <button
              onClick={() => handleNav('system-settings')}
              className={`w-full text-left flex items-center gap-space-sm px-space-sm py-space-xs rounded-lg transition-all ${
                activePath === 'system-settings'
                  ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
              <span className="font-label-lg text-label-lg">System Config</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Bottom Co-Pilot launcher and stats */}
      <div className="p-space-md bg-surface-container-lowest border-t border-surface-container-low space-y-space-sm">
        <button
          onClick={onLaunchCopilot}
          className="w-full flex items-center justify-center gap-space-xs h-9 px-space-md rounded-lg bg-surface-container-low text-primary-container font-label-lg text-label-lg hover:bg-surface-container transition-colors font-semibold"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">bubble_chart</span>
          <span>Launch Co-Pilot</span>
        </button>
        <div className="flex items-center justify-between pt-space-xs font-label-sm text-label-sm text-on-surface-variant">
          <span>Bed Occupancy: 84%</span>
          <span className="text-primary font-bold">ED: Level 2</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex-col justify-between border-r border-surface-container-high/40">
        {navContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onCloseMobile} />
          <aside className="relative w-64 max-w-[80vw] h-full bg-surface-container-lowest z-10 shadow-2xl flex flex-col">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
};
