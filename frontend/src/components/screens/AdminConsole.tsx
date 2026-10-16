import React, { useState } from 'react';
import {
  RbacGrant,
  KnowledgeDocument,
  AuditLogItem,
  FormularyItem,
} from '../../types';

interface AdminConsoleProps {
  rbacGrants: RbacGrant[];
  onRevokeGrant: (id: string) => void;
  onAddGrant: (grant: RbacGrant) => void;
  knowledgeDocs: KnowledgeDocument[];
  onAddKnowledgeDoc: (doc: KnowledgeDocument) => void;
  onDeprecateKnowledgeDoc: (id: string) => void;
  onReindexKnowledgeDoc: (id: string) => void;
  auditLogs: AuditLogItem[];
  formularyItems: FormularyItem[];
  onReorderFormulary: (id: string) => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  rbacGrants,
  onRevokeGrant,
  onAddGrant,
  knowledgeDocs,
  onAddKnowledgeDoc,
  onDeprecateKnowledgeDoc,
  onReindexKnowledgeDoc,
  auditLogs,
  formularyItems,
  onReorderFormulary,
}) => {
  // Navigation tabs: 'ops' | 'rbac' | 'kb' | 'audit'
  const [adminTab, setAdminTab] = useState<'ops' | 'rbac' | 'kb' | 'audit'>('ops');

  // Sandbox Lock state
  const [sandboxLocked, setSandboxLocked] = useState(false);

  // Billing Module state
  const [invoicePatient, setInvoicePatient] = useState('90214');
  const [invoiceMessage, setInvoiceMessage] = useState<string | null>(null);

  // RBAC Filter and Modals
  const [rbacSearch, setRbacSearch] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<RbacGrant | null>(null);
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [newGrantDoc, setNewGrantDoc] = useState('Dr. Sarah Lin, MD');
  const [newGrantNpi, setNewGrantNpi] = useState('1982736450');
  const [newGrantMrn, setNewGrantMrn] = useState('MRN-90214');
  const [newGrantPtName, setNewGrantPtName] = useState('John Doe');
  const [newGrantDept, setNewGrantDept] = useState('Cardiovascular Intensive Care');
  const [newGrantType, setNewGrantType] = useState<'Primary Attending' | 'Consult Only (48h)' | 'Emergency Override'>('Consult Only (48h)');

  // Knowledge Base Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('Clinical Protocol');
  const [newDocAudience, setNewDocAudience] = useState('Doctor / Clinical Staff');

  // Audit Log Filters and Inspection Drawer
  const [auditSearch, setAuditSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogItem | null>(null);

  // Ward Notification & Schedule Modals
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const handleGenerateInvoice = () => {
    setInvoiceMessage(`Batch Claim #INV-2025-0988 for MRN-${invoicePatient} Compiled & Dispatched to Clearinghouse.`);
    setTimeout(() => {
      setInvoiceMessage(null);
    }, 4500);
  };

  const handleConfirmRevoke = () => {
    if (revokeTarget) {
      onRevokeGrant(revokeTarget.id);
      setRevokeTarget(null);
    }
  };

  const handleCreateGrant = (e: React.FormEvent) => {
    e.preventDefault();
    const grant: RbacGrant = {
      id: `grant-${Date.now()}`,
      physicianName: newGrantDoc,
      npi: newGrantNpi,
      patientMrn: newGrantMrn,
      patientName: newGrantPtName,
      department: newGrantDept,
      grantType: newGrantType,
      expiryDate: newGrantType === 'Emergency Override' ? 'Expires in 4h' : '2025-05-01 23:59 EST',
      isEmergency: newGrantType === 'Emergency Override',
    };
    onAddGrant(grant);
    setShowGrantModal(false);
    alert(`Care grant established for ${newGrantDoc} to patient ${newGrantPtName} (${newGrantMrn}).`);
  };

  const handleUploadDoc = (e: React.FormEvent) => {
    e.preventDefault();
    const doc: KnowledgeDocument = {
      id: `doc-${Date.now()}`,
      title: newDocTitle || 'Clinical Protocol for Inpatient Hyperglycemia',
      sha: `${Math.random().toString(36).substring(2, 8)}..${Math.random().toString(36).substring(2, 6)}`,
      pages: 24,
      chunkInfo: 'Vector Chunk Size: 512 • Plain English & FHIR Verified',
      category: newDocCategory,
      audience: newDocAudience,
      version: 'v1.0.0',
      status: 'Active & Indexed',
    };
    onAddKnowledgeDoc(doc);
    setShowUploadModal(false);
    setNewDocTitle('');
    alert(`Document "${doc.title}" indexed into Agentic RAG Vector Store.`);
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`High-priority clinical broadcast sent to all 48 on-call attending devices: "${broadcastMessage}"`);
    setShowBroadcastModal(false);
    setBroadcastMessage('');
  };

  // Filter RBAC Matrix
  const filteredRbac = rbacGrants.filter((g) => {
    const q = rbacSearch.toLowerCase();
    return (
      g.physicianName.toLowerCase().includes(q) ||
      g.patientMrn.toLowerCase().includes(q) ||
      g.patientName.toLowerCase().includes(q) ||
      g.department.toLowerCase().includes(q)
    );
  });

  // Filter Audit Logs
  const filteredAudit = auditLogs.filter((log) => {
    const q = auditSearch.toLowerCase();
    const matchesQ =
      log.actor.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.resourceId.toLowerCase().includes(q) ||
      log.ip.toLowerCase().includes(q);
    const matchesSev = severityFilter === 'ALL' || log.severity === severityFilter;
    return matchesQ && matchesSev;
  });

  return (
    <div className="flex flex-col w-full pb-16">
      <div className="px-4 sm:px-space-xl py-space-lg space-y-space-xl">
        {/* Top Executive Context Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-space-2xs font-semibold">
              <span>St. Jude Academic Health System</span>
              <span>•</span>
              <span className="text-primary font-bold">COO Executive Command</span>
            </div>
            <div className="flex items-center gap-space-sm flex-wrap">
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                Admin & Agentic AI Governance Console
              </h1>
              <span className="inline-flex items-center px-space-xs py-space-2xs rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-container mr-1.5 inline-block animate-pulse"></span>
                Agentic Policy Enforced
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
              Admin: <span className="font-bold text-on-surface">Marcus Vance (COO)</span> • Active Session:{' '}
              <span className="font-code-sm text-code-sm text-secondary font-mono">#OPS-AUTH-88219</span>
            </p>
          </div>

          {/* Action Utilities */}
          <div className="flex items-center gap-space-sm flex-wrap">
            <div className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm border border-surface-container-high/60">
              <span className="material-symbols-outlined text-[16px] text-primary">security_update_good</span>
              <span>HIPAA / SOC-2 Type II Certified</span>
            </div>
            <button
              className="flex items-center gap-space-xs h-9 px-space-md rounded-lg bg-surface-container-lowest text-on-surface font-label-lg text-label-lg shadow-xs hover:bg-surface-container-low transition-colors border border-surface-container-high/60 cursor-pointer font-semibold"
              onClick={() => alert('Compliance Manifest Exported: 1,280 zero-trust token handshakes, AES-256 integrity report downloaded.')}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">file_download</span>
              <span>Export Compliance Manifest</span>
            </button>
            <button
              className={`flex items-center gap-space-xs h-9 px-space-md rounded-lg font-label-lg text-label-lg transition-colors cursor-pointer font-bold ${
                sandboxLocked
                  ? 'bg-error text-on-error'
                  : 'bg-error-container text-on-error-container hover:bg-error hover:text-on-error'
              }`}
              onClick={() => {
                setSandboxLocked(!sandboxLocked);
                alert(
                  sandboxLocked
                    ? 'Agent Sandbox Unlocked: Autonomous Copilot write privileges restored.'
                    : 'Emergency Freeze Enacted: All Autonomous Agent Tool Calls locked to read-only sandbox mode.'
                );
              }}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">
                {sandboxLocked ? 'lock_open' : 'lock'}
              </span>
              <span>{sandboxLocked ? 'Agent Sandbox Locked' : 'Agent Sandbox Lock'}</span>
            </button>
          </div>
        </div>

        {/* 1. Top Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-lg">
          {/* Metric 1 */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs flex flex-col justify-between border border-surface-container-high/60">
            <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
              <span className="font-label-md text-label-md uppercase tracking-wider font-semibold">
                Hospital Encounters
              </span>
              <span className="material-symbols-outlined text-[18px] text-primary">calendar_month</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display text-display text-on-surface font-bold">1,420</span>
              <span className="font-label-sm text-label-sm text-primary font-bold">This Month</span>
            </div>
            <div className="flex items-center justify-between mt-space-sm pt-space-xs bg-surface-container-low px-space-xs py-1 rounded">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                ED: 412 | Ambulatory: 1,008
              </span>
              <span className="font-label-sm text-label-sm text-primary font-bold">+6.2% MoM</span>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs flex flex-col justify-between border border-surface-container-high/60">
            <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
              <span className="font-label-md text-label-md uppercase tracking-wider font-semibold">
                Census & Rostering
              </span>
              <span className="material-symbols-outlined text-[18px] text-primary">groups</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display text-display text-on-surface font-bold">342</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Patients</span>
              <span className="mx-1 text-outline-variant">/</span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold">48</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Attending</span>
            </div>
            <div className="flex items-center justify-between mt-space-sm pt-space-xs bg-surface-container-low px-space-xs py-1 rounded">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Bed Occupancy: 84.1%
              </span>
              <span className="font-label-sm text-label-sm text-primary font-bold">Ratio 7.1:1</span>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs flex flex-col justify-between border border-surface-container-high/60">
            <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
              <span className="font-label-md text-label-md uppercase tracking-wider font-semibold">
                Formulary Stock
              </span>
              <span className="material-symbols-outlined text-[18px] text-tertiary">inventory_2</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-space-xs">
                <span className="font-display text-display text-on-surface font-bold">94%</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                  In-Stock
                </span>
              </div>
              <span className="px-space-xs py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                3 Low-Stock Alerts
              </span>
            </div>
            <div className="w-full bg-surface-container mt-space-sm h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary-container h-full rounded-full" style={{ width: '94%' }}></div>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs flex flex-col justify-between border border-surface-container-high/60">
            <div className="flex items-center justify-between text-on-surface-variant mb-space-xs">
              <span className="font-label-md text-label-md uppercase tracking-wider font-semibold">
                Agent Engine Status
              </span>
              <span className="material-symbols-outlined text-[18px] text-primary">neurology</span>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-display text-display text-primary font-bold">99.8%</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                Execution SLA
              </span>
            </div>
            <div className="flex items-center justify-between mt-space-sm pt-space-xs bg-surface-container-low px-space-xs py-1 rounded">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                1,280 Daily Invocations
              </span>
              <span className="font-label-sm text-label-sm text-primary font-bold">0 Breaches</span>
            </div>
          </div>
        </div>

        {/* 2. Navigation Tabs for Admin Modules */}
        <div className="flex flex-col space-y-space-lg">
          <div className="flex items-center gap-space-xs p-1 bg-surface-container-low rounded-xl overflow-x-auto shadow-inner border border-surface-container-high/60">
            <button
              className={`flex items-center gap-space-xs px-space-md py-2 rounded-lg font-label-lg text-label-lg transition-all cursor-pointer ${
                adminTab === 'ops'
                  ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => setAdminTab('ops')}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">local_hospital</span>
              <span>1. Operational Management</span>
            </button>

            <button
              className={`flex items-center gap-space-xs px-space-md py-2 rounded-lg font-label-lg text-label-lg transition-all cursor-pointer ${
                adminTab === 'rbac'
                  ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => setAdminTab('rbac')}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">badge</span>
              <span>2. Patient-Doctor Care Access Grants</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-label-sm text-primary bg-primary-fixed font-bold">
                RBAC Matrix
              </span>
            </button>

            <button
              className={`flex items-center gap-space-xs px-space-md py-2 rounded-lg font-label-lg text-label-lg transition-all cursor-pointer ${
                adminTab === 'kb'
                  ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => setAdminTab('kb')}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
              <span>3. AI Knowledge Base Management</span>
            </button>

            <button
              className={`flex items-center gap-space-xs px-space-md py-2 rounded-lg font-label-lg text-label-lg transition-all cursor-pointer ${
                adminTab === 'audit'
                  ? 'bg-surface-container-lowest text-primary shadow-xs font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => setAdminTab('audit')}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">shield</span>
              <span>4. AI Activity & Security Audit Logs</span>
              <span className="w-2 h-2 rounded-full bg-error animate-ping ml-1"></span>
            </button>
          </div>

          {/* TAB 1: OPERATIONAL MANAGEMENT */}
          {adminTab === 'ops' && (
            <div className="flex flex-col space-y-space-lg">
              {/* Operational Grid: Sub-modules A & B */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg">
                {/* Sub-module A: Patient Management & Triage Census (7 cols) */}
                <div className="xl:col-span-7 bg-surface-container-lowest rounded-xl shadow-xs p-space-lg flex flex-col justify-between border border-surface-container-high/60">
                  <div>
                    <div className="flex items-center justify-between pb-space-md">
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          personal_injury
                        </span>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          Active Inpatient Ward Admissions & Triage
                        </h3>
                      </div>
                      <span className="font-code-sm text-code-sm text-on-surface-variant bg-surface-container-low px-space-xs py-1 rounded border border-surface-container-high/40">
                        Updated 2m ago
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-body-sm text-body-sm">
                        <thead>
                          <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase">
                            <th className="py-2.5 px-space-sm font-semibold">MRN / Patient</th>
                            <th className="py-2.5 px-space-sm font-semibold">Ward & Bed</th>
                            <th className="py-2.5 px-space-sm font-semibold">Primary Diagnosis</th>
                            <th className="py-2.5 px-space-sm font-semibold">Acuity Level</th>
                            <th className="py-2.5 px-space-sm font-semibold text-right">Attending</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container-low text-on-surface font-body-sm">
                          <tr className="hover:bg-surface-container-low/50">
                            <td className="py-2.5 px-space-sm">
                              <div className="font-bold font-code-sm text-code-sm text-primary">
                                #MRN-90214
                              </div>
                              <div className="font-medium">Eleanor Vance</div>
                            </td>
                            <td className="py-2.5 px-space-sm">ICU - Pod B04</td>
                            <td className="py-2.5 px-space-sm">Acute Respiratory Distress (ARDS)</td>
                            <td className="py-2.5 px-space-sm">
                              <span className="inline-flex items-center px-space-xs py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                                ESI-1 Critical
                              </span>
                            </td>
                            <td className="py-2.5 px-space-sm text-right font-medium">Dr. Lin, Emily</td>
                          </tr>

                          <tr className="hover:bg-surface-container-low/50">
                            <td className="py-2.5 px-space-sm">
                              <div className="font-bold font-code-sm text-code-sm text-primary">
                                #MRN-88301
                              </div>
                              <div className="font-medium">David Sterling</div>
                            </td>
                            <td className="py-2.5 px-space-sm">Cardiology - 312A</td>
                            <td className="py-2.5 px-space-sm">NSTEMI Post-PCI Monitoring</td>
                            <td className="py-2.5 px-space-sm">
                              <span className="inline-flex items-center px-space-xs py-0.5 rounded bg-surface-container-highest text-primary font-label-sm text-label-sm font-bold">
                                ESI-2 Urgent
                              </span>
                            </td>
                            <td className="py-2.5 px-space-sm text-right font-medium">Dr. Thorne, Aris</td>
                          </tr>

                          <tr className="hover:bg-surface-container-low/50">
                            <td className="py-2.5 px-space-sm">
                              <div className="font-bold font-code-sm text-code-sm text-primary">
                                #MRN-91142
                              </div>
                              <div className="font-medium">Sophia Martinez</div>
                            </td>
                            <td className="py-2.5 px-space-sm">Surgical Stepdown - 208</td>
                            <td className="py-2.5 px-space-sm">Laparoscopic Hemicolectomy</td>
                            <td className="py-2.5 px-space-sm">
                              <span className="inline-flex items-center px-space-xs py-0.5 rounded bg-secondary-container text-on-secondary-fixed font-label-sm text-label-sm font-bold">
                                ESI-3 Moderate
                              </span>
                            </td>
                            <td className="py-2.5 px-space-sm text-right font-medium">Dr. Reynolds, K.</td>
                          </tr>

                          <tr className="hover:bg-surface-container-low/50">
                            <td className="py-2.5 px-space-sm">
                              <div className="font-bold font-code-sm text-code-sm text-primary">
                                #MRN-77409
                              </div>
                              <div className="font-medium">Harold Finch</div>
                            </td>
                            <td className="py-2.5 px-space-sm">Observation Unit - O-04</td>
                            <td className="py-2.5 px-space-sm">Transient Ischemic Attack (TIA)</td>
                            <td className="py-2.5 px-space-sm">
                              <span className="inline-flex items-center px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-bold">
                                ESI-4 Stable
                              </span>
                            </td>
                            <td className="py-2.5 px-space-sm text-right font-medium">Dr. Okafor, Chioma</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-space-md mt-space-sm border-t border-surface-container-low">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Showing 4 of 342 active bed allocations
                    </span>
                    <button
                      className="font-label-sm text-label-sm text-primary hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      onClick={() => alert('Accessing full electronic census board across all 12 hospital pods.')}
                    >
                      <span>Open Full Inpatient Roster</span>
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                  </div>
                </div>

                {/* Sub-module B: Doctor Rostering & Department Assignment (5 cols) */}
                <div className="xl:col-span-5 bg-surface-container-lowest rounded-xl shadow-xs p-space-lg flex flex-col justify-between border border-surface-container-high/60">
                  <div>
                    <div className="flex items-center justify-between pb-space-md">
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          stethoscope
                        </span>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          Physician Rostering & Shifts
                        </h3>
                      </div>
                      <span className="font-label-sm text-label-sm bg-surface-container-high text-primary px-space-xs py-0.5 rounded font-bold">
                        48 Attending
                      </span>
                    </div>

                    <div className="space-y-space-sm">
                      {/* Roster Item 1 */}
                      <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between border border-surface-container-high/40">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-label-md">
                            ET
                          </div>
                          <div>
                            <div className="font-label-lg text-label-lg text-on-surface font-semibold">
                              Dr. Emily Thorne, MD
                            </div>
                            <div className="font-code-sm text-code-sm text-on-surface-variant">
                              Emergency Medicine • ED Floor Lead
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-0.5 rounded bg-surface-container text-primary font-label-sm text-label-sm font-bold">
                            07:00 - 19:00
                          </span>
                          <div className="font-code-sm text-code-sm text-secondary font-medium mt-0.5">
                            Assigned: 14 pts
                          </div>
                        </div>
                      </div>

                      {/* Roster Item 2 */}
                      <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between border border-surface-container-high/40">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary flex items-center justify-center font-bold text-label-md">
                            AL
                          </div>
                          <div>
                            <div className="font-label-lg text-label-lg text-on-surface font-semibold">
                              Dr. Alan Lin, MD, FACC
                            </div>
                            <div className="font-code-sm text-code-sm text-on-surface-variant">
                              Cardiology & Cath Lab • On-Call
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-0.5 rounded bg-surface-container text-primary font-label-sm text-label-sm font-bold">
                            24hr Telemetry
                          </span>
                          <div className="font-code-sm text-code-sm text-secondary font-medium mt-0.5">
                            Assigned: 9 pts
                          </div>
                        </div>
                      </div>

                      {/* Roster Item 3 */}
                      <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between border border-surface-container-high/40">
                        <div className="flex items-center gap-space-sm">
                          <div className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold text-label-md">
                            CO
                          </div>
                          <div>
                            <div className="font-label-lg text-label-lg text-on-surface font-semibold">
                              Dr. Chioma Okafor, MD
                            </div>
                            <div className="font-code-sm text-code-sm text-on-surface-variant">
                              Neurology & Stroke Unit
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-0.5 rounded bg-surface-container text-primary font-label-sm text-label-sm font-bold">
                            19:00 - 07:00
                          </span>
                          <div className="font-code-sm text-code-sm text-secondary font-medium mt-0.5">
                            Assigned: 6 pts
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-space-md mt-space-sm flex gap-space-xs">
                    <button
                      className="flex-1 py-1.5 px-space-sm rounded bg-surface-container-low text-primary font-label-sm text-label-sm font-bold hover:bg-surface-container transition-colors cursor-pointer border border-surface-container-high/60"
                      onClick={() => alert('Schedule shift matrix loaded for October 2026.')}
                      type="button"
                    >
                      Modify Schedule Matrix
                    </button>
                    <button
                      className="flex-1 py-1.5 px-space-sm rounded bg-surface-container-low text-primary font-label-sm text-label-sm font-bold hover:bg-surface-container transition-colors cursor-pointer border border-surface-container-high/60"
                      onClick={() => setShowBroadcastModal(true)}
                      type="button"
                    >
                      Broadcast Ward Notification
                    </button>
                  </div>
                </div>
              </div>

              {/* Operational Grid: Formulary & Billing (Split 7/5) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
                {/* Sub-module C: Pharmacy Formulary & Inventory (7 cols) */}
                <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl shadow-xs p-space-lg border border-surface-container-high/60">
                  <div className="flex items-center justify-between pb-space-md">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-tertiary text-[20px]">
                        vaccines
                      </span>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                        Pharmacy Formulary & Stock Depletion
                      </h3>
                    </div>
                    <span className="font-label-sm text-label-sm text-error font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-error inline-block"></span>
                      3 Critical Thresholds
                    </span>
                  </div>

                  <div className="space-y-space-md">
                    {formularyItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-space-sm rounded-lg bg-surface-container-low/70 space-y-space-xs border border-surface-container-high/40"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-label-lg text-label-lg font-bold text-on-surface">
                              {item.name}
                            </span>
                            <span className="font-code-sm text-code-sm text-on-surface-variant ml-2 font-mono">
                              {item.ndc}
                            </span>
                          </div>
                          {item.isLow ? (
                            <button
                              className="px-space-sm py-1 bg-primary text-on-primary font-label-sm text-label-sm rounded font-bold hover:bg-primary-container transition-all flex items-center gap-1 cursor-pointer"
                              onClick={() => onReorderFormulary(item.id)}
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[14px]">refresh</span>
                              <span>Reorder Stock</span>
                            </button>
                          ) : (
                            <span className="font-label-sm text-label-sm text-primary font-bold">
                              Stable Supply
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-space-sm">
                          <div className="flex-1 bg-surface-container rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.isLow ? 'bg-error' : 'bg-primary-container'
                              }`}
                              style={{ width: `${item.percentage}%` }}
                            ></div>
                          </div>
                          <span
                            className={`font-code-sm text-code-sm font-bold ${
                              item.isLow ? 'text-error' : 'text-on-surface'
                            }`}
                          >
                            {item.percentage}% ({item.unitsLeft} units left)
                          </span>
                        </div>

                        <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                          <span>Threshold: {item.threshold} units</span>
                          <span>Par Level: {item.parLevel} units</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-module D: Billing Management & Invoice Generation (5 cols) */}
                <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl shadow-xs p-space-lg flex flex-col justify-between border border-surface-container-high/60">
                  <div>
                    <div className="flex items-center justify-between pb-space-md">
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          receipt_long
                        </span>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          Itemized Invoice Generation
                        </h3>
                      </div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                        CMS-1500 / UB-04
                      </span>
                    </div>

                    <div className="space-y-space-sm bg-surface-container-low p-space-md rounded-lg mb-space-md border border-surface-container-high/40">
                      <div>
                        <label className="block font-label-md text-label-md text-on-surface-variant uppercase mb-1 font-semibold">
                          Target Patient Encounter
                        </label>
                        <select
                          className="w-full h-9 bg-surface-container-lowest text-on-surface font-body-sm text-body-sm px-space-sm rounded-lg focus:outline-none border border-surface-container-high/60 cursor-pointer"
                          value={invoicePatient}
                          onChange={(e) => setInvoicePatient(e.target.value)}
                        >
                          <option value="90214">MRN-90214 | Eleanor Vance (ARDS - ICU Pod B)</option>
                          <option value="88301">MRN-88301 | David Sterling (NSTEMI - Cath Lab)</option>
                          <option value="91142">MRN-91142 | Sophia Martinez (Hemicolectomy)</option>
                        </select>
                      </div>

                      <div className="space-y-1 text-on-surface-variant font-code-sm text-code-sm pt-space-xs">
                        <div className="flex justify-between">
                          <span>Diagnostic DRG 193:</span>
                          <span className="font-bold text-on-surface">$12,480.00</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pharmacy Dispensation (Epi/Prop):</span>
                          <span className="font-bold text-on-surface">$1,940.50</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Agent Telemetry Surveillance (Fee):</span>
                          <span className="font-bold text-on-surface">$320.00</span>
                        </div>
                        <div className="flex justify-between border-t border-surface-container-high pt-1 font-bold text-on-surface">
                          <span>Estimated Net Billing:</span>
                          <span className="text-primary font-headline-sm text-headline-sm font-bold">
                            $14,740.50
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-space-xs">
                    <button
                      className="w-full h-9 bg-primary-container text-on-primary font-label-lg text-label-lg rounded-lg hover:bg-primary transition-colors flex items-center justify-center gap-space-xs cursor-pointer font-bold shadow-xs"
                      onClick={handleGenerateInvoice}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">point_of_sale</span>
                      <span>Generate Itemized Claim Batch</span>
                    </button>

                    {invoiceMessage && (
                      <div className="text-center py-1 font-label-sm text-label-sm text-primary font-bold animate-fade-in">
                        {invoiceMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RBAC CARE ACCESS GRANTS MATRIX */}
          {adminTab === 'rbac' && (
            <div className="flex flex-col space-y-space-md">
              <div className="bg-surface-container-lowest rounded-xl shadow-xs p-space-lg border border-surface-container-high/60">
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-space-lg gap-space-md">
                  <div>
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary text-[22px]">policy</span>
                      <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                        Role-Based Access Control: Clinical Care Grants Matrix
                      </h2>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      Active doctor-to-patient EHR access permissions, emergency override audits, and expiring telemetry authorizations.
                    </p>
                  </div>

                  <div className="flex items-center gap-space-sm flex-wrap">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-2.5 top-2 text-on-surface-variant text-[16px]">
                        search
                      </span>
                      <input
                        className="h-8 pl-8 pr-3 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-lg focus:outline-none w-48 border border-surface-container-high/60"
                        placeholder="Filter MRN, Doctor..."
                        type="text"
                        value={rbacSearch}
                        onChange={(e) => setRbacSearch(e.target.value)}
                      />
                    </div>
                    <button
                      className="flex items-center gap-1 h-8 px-space-sm bg-primary text-on-primary font-label-sm text-label-sm rounded-lg hover:bg-primary-container transition-colors cursor-pointer font-bold shadow-xs"
                      onClick={() => setShowGrantModal(true)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_moderator</span>
                      <span>Grant Ad-Hoc Access</span>
                    </button>
                  </div>
                </div>

                {/* RBAC Matrix Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-body-sm text-body-sm">
                    <thead>
                      <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase">
                        <th className="py-2.5 px-space-sm">Physician</th>
                        <th className="py-2.5 px-space-sm">Patient MRN</th>
                        <th className="py-2.5 px-space-sm">Department</th>
                        <th className="py-2.5 px-space-sm">Care Grant Type</th>
                        <th className="py-2.5 px-space-sm">Expiry Date</th>
                        <th className="py-2.5 px-space-sm text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-low text-on-surface font-body-sm">
                      {filteredRbac.map((grant) => (
                        <tr key={grant.id} className="hover:bg-surface-container-low/50">
                          <td className="py-3 px-space-sm">
                            <div className="font-bold text-on-surface">{grant.physicianName}</div>
                            <div className="font-code-sm text-code-sm text-secondary font-mono">
                              NPI: {grant.npi}
                            </div>
                          </td>
                          <td className="py-3 px-space-sm">
                            <span className="font-code-sm text-code-sm font-bold text-primary font-mono">
                              #{grant.patientMrn}
                            </span>
                            <div className="font-body-sm text-body-sm text-on-surface-variant">
                              {grant.patientName}
                            </div>
                          </td>
                          <td className="py-3 px-space-sm font-medium">{grant.department}</td>
                          <td className="py-3 px-space-sm">
                            {grant.grantType === 'Primary Attending' && (
                              <span className="inline-flex items-center px-space-xs py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-bold">
                                Primary Attending
                              </span>
                            )}
                            {grant.grantType === 'Consult Only (48h)' && (
                              <span className="inline-flex items-center px-space-xs py-0.5 rounded bg-secondary-container text-on-secondary-fixed font-label-sm text-label-sm font-bold">
                                Consult Only (48h)
                              </span>
                            )}
                            {grant.grantType === 'Emergency Override' && (
                              <span className="inline-flex items-center px-space-xs py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                                <span className="material-symbols-outlined text-[13px] mr-1">warning</span>
                                Emergency Override
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-space-sm font-code-sm text-code-sm">
                            <span
                              className={
                                grant.isEmergency ? 'text-error font-bold' : 'text-on-surface-variant'
                              }
                            >
                              {grant.expiryDate}
                            </span>
                          </td>
                          <td className="py-3 px-space-sm text-right">
                            <button
                              className="px-space-xs py-1 rounded text-error hover:bg-error-container font-label-sm text-label-sm font-bold transition-colors cursor-pointer"
                              onClick={() => setRevokeTarget(grant)}
                              type="button"
                            >
                              {grant.isEmergency ? 'Terminate Override' : 'Revoke Access'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI KNOWLEDGE BASE MANAGEMENT */}
          {adminTab === 'kb' && (
            <div className="flex flex-col space-y-space-md">
              <div className="bg-surface-container-lowest rounded-xl shadow-xs p-space-lg border border-surface-container-high/60">
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-space-lg gap-space-md">
                  <div>
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary text-[22px]">library_books</span>
                      <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                        Agentic RAG Knowledge Base & Clinical Corpus
                      </h2>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      Manage semantic vector embeddings, verify document audience boundaries, and control agent inference boundaries.
                    </p>
                  </div>
                  <button
                    className="flex items-center gap-space-xs h-9 px-space-md bg-primary-container text-on-primary font-label-lg text-label-lg rounded-lg hover:bg-primary transition-colors cursor-pointer font-bold shadow-xs"
                    onClick={() => setShowUploadModal(true)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    <span>Upload New Document</span>
                  </button>
                </div>

                {/* Documents Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-body-sm text-body-sm">
                    <thead>
                      <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase">
                        <th className="py-2.5 px-space-sm">Document Title</th>
                        <th className="py-2.5 px-space-sm">Category</th>
                        <th className="py-2.5 px-space-sm">Audience Scope</th>
                        <th className="py-2.5 px-space-sm">Version</th>
                        <th className="py-2.5 px-space-sm">Vector Indexing Status</th>
                        <th className="py-2.5 px-space-sm text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-low text-on-surface font-body-sm">
                      {knowledgeDocs.map((doc) => (
                        <tr key={doc.id} className="hover:bg-surface-container-low/50">
                          <td className="py-3 px-space-sm">
                            <div className="font-bold text-on-surface flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px] text-primary">
                                description
                              </span>
                              <span>{doc.title}</span>
                            </div>
                            <span className="font-code-sm text-code-sm text-secondary font-mono">
                              SHA-256: {doc.sha} • {doc.pages} pages • {doc.chunkInfo}
                            </span>
                          </td>
                          <td className="py-3 px-space-sm font-medium">{doc.category}</td>
                          <td className="py-3 px-space-sm">
                            <span
                              className={`inline-flex items-center px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold ${
                                doc.audience.includes('Restricted')
                                  ? 'bg-error-container text-on-error-container'
                                  : doc.audience.includes('Patient')
                                  ? 'bg-secondary-container text-on-secondary-fixed'
                                  : 'bg-surface-container-high text-primary'
                              }`}
                            >
                              {doc.audience}
                            </span>
                          </td>
                          <td className="py-3 px-space-sm font-code-sm text-code-sm font-mono">
                            {doc.version}
                          </td>
                          <td className="py-3 px-space-sm">
                            {doc.status === 'Active & Indexed' && (
                              <span className="inline-flex items-center gap-1 px-space-xs py-0.5 rounded bg-surface-container text-primary font-label-sm text-label-sm font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                                Active & Indexed
                              </span>
                            )}
                            {doc.status === 'Processing' && (
                              <div className="flex items-center gap-space-xs">
                                <div className="w-20 bg-surface-container rounded-full h-2 overflow-hidden">
                                  <div
                                    className="bg-primary-container h-full rounded-full animate-pulse"
                                    style={{ width: `${doc.progress || 50}%` }}
                                  ></div>
                                </div>
                                <span className="font-code-sm text-code-sm font-bold text-primary font-mono">
                                  Processing {doc.progress || 50}%
                                </span>
                              </div>
                            )}
                            {doc.status === 'Deprecated' && (
                              <span className="inline-flex items-center gap-1 px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-bold">
                                Deprecated
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-space-sm text-right">
                            <button
                              onClick={() => onReindexKnowledgeDoc(doc.id)}
                              className="font-label-sm text-label-sm text-primary hover:underline font-bold mr-2 cursor-pointer"
                            >
                              Re-Index
                            </button>
                            <button
                              onClick={() => onDeprecateKnowledgeDoc(doc.id)}
                              className="font-label-sm text-label-sm text-error hover:underline font-bold cursor-pointer"
                            >
                              Deprecate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AI ACTIVITY & SECURITY AUDIT LOGS */}
          {adminTab === 'audit' && (
            <div className="flex flex-col space-y-space-md">
              <div className="bg-surface-container-lowest rounded-xl shadow-xs p-space-lg border border-surface-container-high/60">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-space-lg gap-space-md">
                  <div>
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary text-[22px]">policy</span>
                      <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                        AI Agent Invocations & Security Audit Stream
                      </h2>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      Real-time cryptographic audit log of LLM tool executions, clinical chart queries, and privilege overrides.
                    </p>
                  </div>

                  {/* Filters */}
                  <div className="flex items-center gap-space-xs flex-wrap">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-2.5 top-2 text-on-surface-variant text-[16px]">
                        search
                      </span>
                      <input
                        className="h-8 pl-8 pr-3 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-lg focus:outline-none w-52 border border-surface-container-high/60"
                        placeholder="Search actor, tool, MRN..."
                        type="text"
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                      />
                    </div>
                    <select
                      className="h-8 px-2 bg-surface-container-low text-on-surface font-label-sm text-label-sm rounded-lg focus:outline-none border border-surface-container-high/60 cursor-pointer"
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                    >
                      <option value="ALL">All Severities</option>
                      <option value="INFO">Info</option>
                      <option value="WARNING">Warning</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                    <button
                      className="h-8 px-space-sm text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm cursor-pointer"
                      onClick={() => {
                        setAuditSearch('');
                        setSeverityFilter('ALL');
                      }}
                      type="button"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Audit Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-body-sm text-body-sm">
                    <thead>
                      <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase">
                        <th className="py-2.5 px-space-sm">Timestamp (UTC)</th>
                        <th className="py-2.5 px-space-sm">Actor</th>
                        <th className="py-2.5 px-space-sm">Action / Executed Tool</th>
                        <th className="py-2.5 px-space-sm">Resource ID</th>
                        <th className="py-2.5 px-space-sm">IP / Origin</th>
                        <th className="py-2.5 px-space-sm">Outcome</th>
                        <th className="py-2.5 px-space-sm text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-low text-on-surface font-body-sm">
                      {filteredAudit.map((log) => (
                        <tr key={log.id} className="hover:bg-surface-container-low/50">
                          <td className="py-2.5 px-space-sm font-code-sm text-code-sm text-secondary font-mono">
                            {log.timestamp}
                          </td>
                          <td className="py-2.5 px-space-sm">
                            <span
                              className={`font-bold ${
                                log.severity === 'CRITICAL'
                                  ? 'text-error'
                                  : log.actor.includes('Agent')
                                  ? 'text-primary'
                                  : 'text-on-surface'
                              }`}
                            >
                              {log.actor}
                            </span>
                            <span className="block font-label-sm text-label-sm text-secondary">
                              {log.actorRole}
                            </span>
                          </td>
                          <td className="py-2.5 px-space-sm">
                            <span
                              className={`font-medium ${
                                log.severity === 'CRITICAL' ? 'text-error' : 'text-on-surface'
                              }`}
                            >
                              {log.action}
                            </span>
                            <span className="block font-code-sm text-code-sm text-secondary">
                              {log.scope}
                            </span>
                          </td>
                          <td
                            className={`py-2.5 px-space-sm font-code-sm text-code-sm font-bold font-mono ${
                              log.severity === 'CRITICAL' ? 'text-error' : 'text-primary'
                            }`}
                          >
                            {log.resourceId}
                          </td>
                          <td className="py-2.5 px-space-sm font-code-sm text-code-sm text-on-surface-variant font-mono">
                            {log.ip}
                          </td>
                          <td className="py-2.5 px-space-sm">
                            <span
                              className={`inline-flex items-center px-space-xs py-0.5 rounded font-label-sm text-label-sm font-bold ${
                                log.severity === 'CRITICAL'
                                  ? 'bg-error-container text-on-error-container'
                                  : log.severity === 'WARNING'
                                  ? 'bg-secondary-container text-on-secondary-fixed'
                                  : 'bg-surface-container text-primary'
                              }`}
                            >
                              {log.outcome}
                            </span>
                          </td>
                          <td className="py-2.5 px-space-sm text-right">
                            <button
                              className={`font-label-sm text-label-sm hover:underline font-bold cursor-pointer ${
                                log.severity === 'CRITICAL' ? 'text-error' : 'text-primary'
                              }`}
                              onClick={() => setSelectedAuditLog(log)}
                              type="button"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: REVOKE ACCESS CONFIRMATION */}
      {revokeTarget && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full shadow-xl p-space-lg space-y-space-md border border-surface-container-high">
            <div className="flex items-center gap-space-xs text-error">
              <span className="material-symbols-outlined text-[24px]">gavel</span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Confirm RBAC Grant Revocation
              </h3>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Are you sure you want to revoke EHR read/write access for{' '}
              <span className="font-bold text-on-surface">{revokeTarget.physicianName}</span> to patient record{' '}
              <span className="font-bold text-primary">#{revokeTarget.patientMrn}</span>?
            </p>
            <div className="bg-surface-container-low p-space-sm rounded-lg font-code-sm text-code-sm text-secondary">
              Notice: All ongoing telemedicine websockets and agent proxy sessions associated with this grant will terminate instantly.
            </div>
            <div className="flex items-center justify-end gap-space-sm pt-space-xs">
              <button
                className="px-space-md py-1.5 rounded-lg text-on-surface-variant font-label-lg text-label-lg hover:bg-surface-container-low transition-colors cursor-pointer"
                onClick={() => setRevokeTarget(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="px-space-md py-1.5 rounded-lg bg-error text-on-error font-label-lg text-label-lg hover:bg-on-error-container transition-colors cursor-pointer font-bold shadow-xs"
                onClick={handleConfirmRevoke}
                type="button"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GRANT AD-HOC ACCESS */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full shadow-xl p-space-lg space-y-space-md border border-surface-container-high">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[22px]">add_moderator</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Grant Ad-Hoc Clinical Clearance
                </h3>
              </div>
              <button onClick={() => setShowGrantModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateGrant} className="space-y-space-sm font-body-sm">
              <div>
                <label className="block font-semibold mb-1">Physician Name & Credential</label>
                <input
                  type="text"
                  required
                  className="w-full h-9 px-3 bg-surface-container-low rounded-lg border border-surface-container-high"
                  value={newGrantDoc}
                  onChange={(e) => setNewGrantDoc(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">NPI Number</label>
                  <input
                    type="text"
                    required
                    className="w-full h-9 px-3 bg-surface-container-low rounded-lg border border-surface-container-high"
                    value={newGrantNpi}
                    onChange={(e) => setNewGrantNpi(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Target Patient MRN</label>
                  <input
                    type="text"
                    required
                    className="w-full h-9 px-3 bg-surface-container-low rounded-lg border border-surface-container-high"
                    value={newGrantMrn}
                    onChange={(e) => setNewGrantMrn(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full h-9 px-3 bg-surface-container-low rounded-lg border border-surface-container-high"
                  value={newGrantPtName}
                  onChange={(e) => setNewGrantPtName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Care Grant Tier</label>
                  <select
                    className="w-full h-9 px-3 bg-surface-container-low rounded-lg border border-surface-container-high cursor-pointer"
                    value={newGrantType}
                    onChange={(e) =>
                      setNewGrantType(e.target.value as 'Primary Attending' | 'Consult Only (48h)' | 'Emergency Override')
                    }
                  >
                    <option value="Consult Only (48h)">Consult Only (48h)</option>
                    <option value="Primary Attending">Primary Attending</option>
                    <option value="Emergency Override">Emergency Override (Break-Glass)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    className="w-full h-9 px-3 bg-surface-container-low rounded-lg border border-surface-container-high"
                    value={newGrantDept}
                    onChange={(e) => setNewGrantDept(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-xs border-t border-surface-container-low">
                <button
                  type="button"
                  className="px-space-md py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-low"
                  onClick={() => setShowGrantModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-space-md py-1.5 rounded-lg bg-primary text-on-primary font-bold cursor-pointer shadow-xs"
                >
                  Issue Cryptographic Grant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: UPLOAD KB DOCUMENT */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full shadow-xl p-space-lg space-y-space-md border border-surface-container-high">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[22px]">post_add</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Ingest Knowledge Base Corpus
                </h3>
              </div>
              <button onClick={() => setShowUploadModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUploadDoc} className="space-y-space-sm font-body-sm">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant uppercase mb-1 font-semibold">
                  Document Title
                </label>
                <input
                  className="w-full h-9 bg-surface-container-low text-on-surface px-space-sm rounded-lg focus:outline-none font-body-sm text-body-sm border border-surface-container-high"
                  placeholder="e.g., Clinical Protocol for Diabetic Ketoacidosis"
                  type="text"
                  required
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-space-sm">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant uppercase mb-1 font-semibold">
                    Category
                  </label>
                  <select
                    className="w-full h-9 bg-surface-container-low text-on-surface px-space-sm rounded-lg focus:outline-none font-body-sm text-body-sm border border-surface-container-high cursor-pointer"
                    value={newDocCategory}
                    onChange={(e) => setNewDocCategory(e.target.value)}
                  >
                    <option value="Clinical Protocol">Clinical Protocol</option>
                    <option value="Patient FAQ">Patient FAQ</option>
                    <option value="Pharmacy Manual">Pharmacy Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant uppercase mb-1 font-semibold">
                    Audience Scope
                  </label>
                  <select
                    className="w-full h-9 bg-surface-container-low text-on-surface px-space-sm rounded-lg focus:outline-none font-body-sm text-body-sm border border-surface-container-high cursor-pointer"
                    value={newDocAudience}
                    onChange={(e) => setNewDocAudience(e.target.value)}
                  >
                    <option value="Doctor / Clinical Staff">Doctor / Clinical Staff</option>
                    <option value="Patient / Public">Patient / Public</option>
                    <option value="Restricted Admin Only">Restricted Admin Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant uppercase mb-1 font-semibold">
                  Upload PDF / Clinical Standard (FHIR/HL7)
                </label>
                <div
                  className="p-space-lg rounded-xl bg-surface-container-low text-center flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container transition-colors border border-dashed border-surface-container-high"
                  onClick={() => {
                    if (!newDocTitle) setNewDocTitle('Acute Cardiac Rehabilitation Pathway 2026');
                  }}
                >
                  <span className="material-symbols-outlined text-[32px] text-primary mb-1">
                    cloud_upload
                  </span>
                  <span className="font-label-lg text-label-lg text-on-surface font-semibold">
                    Click to select medical documents
                  </span>
                  <span className="font-code-sm text-code-sm text-secondary font-mono">
                    PDF, DOCX, MD, or JSON-FHIR (Max 50MB)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-xs border-t border-surface-container-low">
                <button
                  className="px-space-md py-1.5 rounded-lg text-on-surface-variant font-label-lg text-label-lg hover:bg-surface-container-low cursor-pointer"
                  onClick={() => setShowUploadModal(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="px-space-md py-1.5 rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary transition-colors flex items-center gap-1 cursor-pointer font-bold shadow-xs"
                  type="submit"
                >
                  <span className="material-symbols-outlined text-[16px]">neurology</span>
                  <span>Initiate Chunking & Indexing</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER: LOG DETAIL INSPECTION */}
      {selectedAuditLog && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-surface-container-lowest shadow-2xl z-50 transition-transform duration-200 flex flex-col justify-between border-l border-surface-container-high">
          <div className="p-space-lg flex-1 overflow-y-auto">
            <div className="flex items-center justify-between pb-space-md border-b border-surface-container-low">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">verified_user</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Audit Trace Inspector
                </h3>
              </div>
              <button
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
                onClick={() => setSelectedAuditLog(null)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="py-space-md space-y-space-md font-body-sm text-body-sm">
              <div>
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                  Log Reference
                </span>
                <span className="font-code-sm text-code-sm font-bold text-primary font-mono">
                  #{selectedAuditLog.id}
                </span>
              </div>

              <div>
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                  Severity Flag
                </span>
                <span
                  className={`inline-block px-2 py-0.5 rounded font-label-sm text-label-sm font-bold mt-1 ${
                    selectedAuditLog.severity === 'CRITICAL'
                      ? 'bg-error-container text-on-error-container'
                      : selectedAuditLog.severity === 'WARNING'
                      ? 'bg-secondary-container text-on-secondary-fixed'
                      : 'bg-surface-container text-primary'
                  }`}
                >
                  {selectedAuditLog.severity}
                </span>
              </div>

              <div>
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                  Actor Context
                </span>
                <div className="font-bold text-on-surface">{selectedAuditLog.actor}</div>
                <div className="text-secondary text-xs">{selectedAuditLog.actorRole}</div>
              </div>

              <div>
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                  Invoked Action / Tool
                </span>
                <div className="font-medium text-on-surface">{selectedAuditLog.action}</div>
                <div className="font-mono text-xs text-secondary">{selectedAuditLog.scope}</div>
              </div>

              <div>
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                  Target Resource
                </span>
                <div className="font-code-sm text-code-sm font-bold text-primary font-mono">
                  {selectedAuditLog.resourceId}
                </div>
              </div>

              <div>
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                  Origin Network Address
                </span>
                <div className="font-code-sm text-code-sm text-secondary font-mono">
                  {selectedAuditLog.ip}
                </div>
              </div>

              <div>
                <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">
                  Security Verdict & Trace
                </span>
                <div className="p-space-sm rounded-lg bg-surface-container-low font-code-sm text-code-sm text-on-surface mt-1 leading-relaxed border border-surface-container-high/40">
                  {selectedAuditLog.notes}
                </div>
              </div>
            </div>
          </div>

          <div className="p-space-md border-t border-surface-container-low bg-surface-container-low/50 flex gap-space-xs">
            <button
              className="flex-1 py-1.5 rounded-lg bg-surface-container-lowest font-label-sm text-label-sm text-on-surface shadow-xs hover:bg-surface border border-surface-container-high cursor-pointer font-semibold"
              onClick={() => setSelectedAuditLog(null)}
              type="button"
            >
              Dismiss Inspector
            </button>
            <button
              className="flex-1 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-sm text-label-sm font-bold hover:bg-primary cursor-pointer shadow-xs"
              onClick={() => alert(`Exported Cryptographic SHA-256 Checksum for #${selectedAuditLog.id}`)}
              type="button"
            >
              Export Hash
            </button>
          </div>
        </div>
      )}

      {/* MODAL 4: WARD BROADCAST */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full shadow-xl p-space-lg space-y-space-md border border-surface-container-high">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[22px]">campaign</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Broadcast Ward Notification
                </h3>
              </div>
              <button onClick={() => setShowBroadcastModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleBroadcast} className="space-y-3 font-body-sm">
              <div>
                <label className="block font-semibold mb-1">Target Ward Receivers</label>
                <div className="p-2 bg-surface-container-low rounded text-xs font-semibold text-primary">
                  All 48 Attending Physicians & Inpatient Floor Leads
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Broadcast Message</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g., Code STEMI Cath Lab protocol in effect until 21:00 EST. Divert Non-acute cases to Annex B."
                  className="w-full p-2 bg-surface-container-low rounded-lg border border-surface-container-high"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-surface-container-low">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2 bg-surface-container rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-on-primary font-bold rounded-lg cursor-pointer"
                >
                  Broadcast Stat Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
