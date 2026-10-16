import React, { useState } from 'react';
import { AppRole, Appointment, RbacGrant, KnowledgeDocument } from './types';
import {
  INITIAL_APPOINTMENTS,
  INITIAL_PRESCRIPTIONS,
  INITIAL_REPORTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PATIENTS,
  INITIAL_RBAC_GRANTS,
  INITIAL_KNOWLEDGE_DOCS,
  INITIAL_AUDIT_LOGS,
  INITIAL_FORMULARY_ITEMS,
} from './data/mockData';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthScreen } from './components/screens/AuthScreen';
import { PatientPortal } from './components/screens/PatientPortal';
import { DoctorPortal } from './components/screens/DoctorPortal';
import { AdminConsole } from './components/screens/AdminConsole';

export default function App() {
  const [currentRole, setCurrentRole] = useState<AppRole>('auth');
  const [activeSidebarPath, setActiveSidebarPath] = useState<string>('triage-console');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Core synchronized application state
  const [appointments, setAppointments] = useState<Appointment[]>(INITIAL_APPOINTMENTS);
  const [prescriptions] = useState(INITIAL_PRESCRIPTIONS);
  const [reports] = useState(INITIAL_REPORTS);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [patients] = useState(INITIAL_PATIENTS);
  const [rbacGrants, setRbacGrants] = useState<RbacGrant[]>(INITIAL_RBAC_GRANTS);
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>(INITIAL_KNOWLEDGE_DOCS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [formularyItems, setFormularyItems] = useState(INITIAL_FORMULARY_ITEMS);

  // Quick Co-Pilot Drawer / Modal
  const [copilotModalOpen, setCopilotModalOpen] = useState(false);
  const [quickCopilotQuery, setQuickCopilotQuery] = useState('');
  const [quickCopilotMessages, setQuickCopilotMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: 'CareNexus Autonomous Clinical Agent initialized. Cross-referencing patient EHRs, clinical guidelines, and hospital formulary. How can I assist you?',
    },
  ]);

  const handleAddAppointment = (newApt: Appointment) => {
    setAppointments((prev) => [newApt, ...prev]);
    // Add notification
    setNotifications((prev) => [
      {
        id: `notif-${Date.now()}`,
        title: 'New Appointment Booked',
        timeAgo: 'Just now',
        message: `Consultation confirmed with ${newApt.doctorName} for ${newApt.dateStr} at ${newApt.timeStr}.`,
        unread: true,
      },
      ...prev,
    ]);
  };

  const handleCancelAppointment = (id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleMarkNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleRevokeGrant = (id: string) => {
    setRbacGrants((prev) => prev.filter((g) => g.id !== id));
    setAuditLogs((prev) => [
      {
        id: `LOG-${Date.now().toString().slice(-5)}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        actor: 'Admin Marcus Vance',
        actorRole: 'COO Executive',
        action: 'Revoked RBAC Care Grant',
        scope: `Grant ID: ${id}`,
        resourceId: '#EHR-ACCESS',
        ip: '10.240.1.04',
        outcome: 'Revoked (200 OK)',
        severity: 'WARNING',
        notes: `Care access privileges terminated manually by Administrator Marcus Vance.`,
      },
      ...prev,
    ]);
  };

  const handleAddGrant = (grant: RbacGrant) => {
    setRbacGrants((prev) => [grant, ...prev]);
  };

  const handleAddKnowledgeDoc = (doc: KnowledgeDocument) => {
    setKnowledgeDocs((prev) => [doc, ...prev]);
  };

  const handleDeprecateDoc = (id: string) => {
    setKnowledgeDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'Deprecated' } : d))
    );
  };

  const handleReindexDoc = (id: string) => {
    setKnowledgeDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'Processing', progress: 10 } : d))
    );
    setTimeout(() => {
      setKnowledgeDocs((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'Active & Indexed', progress: 100 } : d))
      );
      alert('Document re-indexing completed successfully.');
    }, 1500);
  };

  const handleReorderFormulary = (id: string) => {
    setFormularyItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              unitsLeft: item.parLevel,
              percentage: 100,
              isLow: false,
            }
          : item
      )
    );
    alert('Emergency stock replenishment dispatched to Hospital Pharmacy.');
  };

  const handleQuickCopilotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCopilotQuery.trim()) return;
    const q = quickCopilotQuery;
    setQuickCopilotMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setQuickCopilotQuery('');

    setTimeout(() => {
      let resp = '';
      const lower = q.toLowerCase();
      if (lower.includes('john doe') || lower.includes('90214')) {
        resp = 'John Doe (MRN-90214): POD 4 status-post CABG. Vitals stable: BP 114/72, HR 58 bpm. Transitioning to Metoprolol Succinate 25mg QD and Atorvastatin 80mg QD.';
      } else if (lower.includes('bed') || lower.includes('occupancy')) {
        resp = 'Current Hospital Bed Occupancy is 84.1% across 342 active census beds. Emergency Department is operating at Level 2 Acuity.';
      } else {
        resp = `Agent Intelligence Response: Clinical query processed against institutional corpus and verified patient telemetry. Zero contradictions detected with active formulary.`;
      }
      setQuickCopilotMessages((prev) => [...prev, { sender: 'ai', text: resp }]);
    }, 500);
  };

  const handleSidebarNavigate = (path: string) => {
    setActiveSidebarPath(path);
    if (path === 'triage-console') {
      setCurrentRole('doctor');
    } else if (path === 'patient-directory' || path === 'electronic-health-records') {
      setCurrentRole('doctor');
    } else if (path === 'ai-agents-workspace' || path === 'decision-audit-logs' || path === 'staff-scheduling' || path === 'system-settings') {
      setCurrentRole('admin');
    } else if (path === 'prescriptions-pharmacy' || path === 'diagnostic-imaging') {
      setCurrentRole('patient');
    }
  };

  // If in 'auth' mode, display the full-fidelity Login / Auth Portal (Screen 1)
  if (currentRole === 'auth') {
    return <AuthScreen onLoginSuccess={(role) => setCurrentRole(role)} />;
  }

  // Dashboard layout with Sidebar & Header
  return (
    <div className="bg-surface min-h-screen text-on-surface antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentRole={currentRole}
        onRoleChange={(r) => setCurrentRole(r)}
        activePath={activeSidebarPath}
        onNavigate={handleSidebarNavigate}
        onLaunchCopilot={() => setCopilotModalOpen(true)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area (offset by 64 = 256px sidebar on desktop) */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header
          currentRole={currentRole}
          onRoleChange={(r) => setCurrentRole(r)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          notifications={notifications}
          onMarkNotificationsRead={handleMarkNotificationsRead}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          onSwitchToAuthPortal={() => setCurrentRole('auth')}
        />

        {/* Viewport Content */}
        <main className="relative w-full pt-16 bg-surface min-h-[calc(100vh-64px)]">
          {currentRole === 'patient' && (
            <PatientPortal
              appointments={appointments}
              onAddAppointment={handleAddAppointment}
              onCancelAppointment={handleCancelAppointment}
              prescriptions={prescriptions}
              reports={reports}
              notifications={notifications}
              onMarkNotificationsRead={handleMarkNotificationsRead}
              onOpenCopilot={() => setCopilotModalOpen(true)}
            />
          )}

          {currentRole === 'doctor' && (
            <DoctorPortal
              patients={patients}
              onOpenPatientChart={(mrn) => {
                alert(`Navigating to verified chart for ${mrn}`);
              }}
            />
          )}

          {currentRole === 'admin' && (
            <AdminConsole
              rbacGrants={rbacGrants}
              onRevokeGrant={handleRevokeGrant}
              onAddGrant={handleAddGrant}
              knowledgeDocs={knowledgeDocs}
              onAddKnowledgeDoc={handleAddKnowledgeDoc}
              onDeprecateKnowledgeDoc={handleDeprecateDoc}
              onReindexKnowledgeDoc={handleReindexDoc}
              auditLogs={auditLogs}
              formularyItems={formularyItems}
              onReorderFormulary={handleReorderFormulary}
            />
          )}
        </main>
      </div>

      {/* Global Clinical Co-Pilot Modal */}
      {copilotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-6 shadow-2xl border border-surface-container-high space-y-4 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-low">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">neurology</span>
                </div>
                <div>
                  <h3 className="font-headline-sm font-bold text-on-surface">CareNexus Co-Pilot</h3>
                  <span className="text-label-sm text-primary font-bold">Autonomous Clinical Agent • 99.8% Ready</span>
                </div>
              </div>
              <button
                onClick={() => setCopilotModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-56">
              {quickCopilotMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl text-body-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-primary-container text-on-primary ml-6'
                      : 'bg-surface-container-low text-on-surface mr-6 border border-surface-container-high/60'
                  }`}
                >
                  {msg.sender === 'ai' && (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-primary mb-1">
                      <span className="material-symbols-outlined text-[14px]">psychology</span>
                      <span>Verified Clinical Engine</span>
                    </div>
                  )}
                  {msg.text}
                </div>
              ))}
            </div>

            <form onSubmit={handleQuickCopilotSubmit} className="relative flex items-center pt-2 border-t border-surface-container-low">
              <input
                type="text"
                className="w-full h-11 pl-4 pr-12 rounded-xl bg-surface-container-low border border-surface-container-high text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-container"
                placeholder="Ask about patient status, formulary, or bed capacity..."
                value={quickCopilotQuery}
                onChange={(e) => setQuickCopilotQuery(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-2 w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center cursor-pointer hover:bg-primary-container"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
