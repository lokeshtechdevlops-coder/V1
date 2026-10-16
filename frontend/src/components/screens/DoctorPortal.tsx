import React, { useState } from 'react';
import { PatientRecord } from '../../types';

interface DoctorPortalProps {
  patients: PatientRecord[];
  onOpenPatientChart?: (mrn: string) => void;
}

export const DoctorPortal: React.FC<DoctorPortalProps> = ({
  patients,
  onOpenPatientChart,
}) => {
  // Main tabs: 'schedule' | 'assigned' | 'detail'
  const [mainTab, setMainTab] = useState<'schedule' | 'assigned' | 'detail'>('schedule');

  // Patient detail sub-tabs: 'overview' | 'vitals' | 'reports' | 'rx'
  const [patientSubTab, setPatientSubTab] = useState<'overview' | 'vitals' | 'reports' | 'rx'>('overview');

  // Simulated unauthorized ward patient banner
  const [showUnauthAlert, setShowUnauthAlert] = useState(false);

  // Search & filter for assigned patients tab
  const [assignedSearch, setAssignedSearch] = useState('');
  const [assignedDivision, setAssignedDivision] = useState('All');
  const [assignedTier, setAssignedTier] = useState('All');

  // Mock Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadComplete, setUploadComplete] = useState(false);

  // Prescription Pad State
  const [medSearch, setMedSearch] = useState('Metoprolol Succinate');
  const [showMedList, setShowMedList] = useState(false);
  const [dosage, setDosage] = useState('25 mg Oral');
  const [frequency, setFrequency] = useState('QD (Once Daily)');
  const [duration, setDuration] = useState('30 Days (Discharge Supply)');
  const [rxNotes, setRxNotes] = useState(
    'Hold dose if Systolic Blood Pressure < 100 mmHg or Heart Rate < 55 bpm. Titrate upward in 2-week outpatient follow-up clinic if tolerated.'
  );
  const [rxSigned, setRxSigned] = useState(false);

  // AI Co-Pilot State
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotHistory, setCopilotHistory] = useState<Array<{ q: string; a: string; latency?: string }>>([]);
  const [orderCommitted, setOrderCommitted] = useState(false);
  const [rapidIntakeModal, setRapidIntakeModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientMrn, setNewPatientMrn] = useState('');
  const [newPatientAcuity, setNewPatientAcuity] = useState('ESI-2 Urgent');

  const handleStartMockUpload = () => {
    setIsUploading(true);
    setUploadPercent(0);
    setUploadComplete(false);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      setUploadPercent(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setUploadComplete(true);
        }, 300);
      }
    }, 250);
  };

  const handleSignPrescription = () => {
    setRxSigned(true);
    alert(
      `Digital Signature Verified: Prescription for ${medSearch} (${dosage}, ${frequency}) transmitted to Inpatient Pharmacy Queue for John Doe (MRN-90214).`
    );
  };

  const handleCommitAgentOrder = () => {
    setOrderCommitted(true);
    alert("Attending Approval Logged: Order set to active in John Doe's Electronic Health Record.");
  };

  const handleCopilotSend = (customPrompt?: string) => {
    const q = customPrompt || copilotQuery.trim();
    if (!q) return;

    let ans = '';
    const lower = q.toLowerCase();
    if (lower.includes('lipid')) {
      ans =
        'John Doe’s 6-month lipid profile demonstrates favorable trajectory: Total Cholesterol declined from 242 mg/dL to 178 mg/dL post-CABG. LDL lowered from 148 to 98 mg/dL following initiation of Atorvastatin. Recommend continuing goal LDL < 70 mg/dL.';
    } else if (lower.includes('ddi') || lower.includes('spironolactone')) {
      ans =
        'DDI Assessment: Lisinopril + Spironolactone dual therapy carries class-moderate hyperkalemia risk. Serum potassium must be evaluated within 7 days. Current K+ is 4.4 mEq/L (Normal). Safe to proceed with serial chemistry monitoring.';
    } else if (lower.includes('discharge') || lower.includes('summary')) {
      ans =
        'Draft Discharge Summary [Bed 412 - John Doe]: POD 4 status-post 3-vessel CABG. Hemodynamically stable, chest tubes removed, ambulating ward corridors without angina. Discharge medications compiled: Metoprolol Succinate 25mg QD, Atorvastatin 80mg QD, Aspirin 81mg QD.';
    } else if (lower.includes('antibiotic') || lower.includes('prophylaxis')) {
      ans =
        'Hospital Surgical Antibiotic Prophylaxis Protocol v3.2: Cephazolin 2g IV administered within 60 mins pre-incision, discontinued within 24 hours post-operatively. For Penicillin-allergic patients (John Doe), Vancomycin 15mg/kg is the standard approved substitute.';
    } else {
      ans = `Clinical Co-Pilot Analysis: Query evaluated against patient EHR [MRN-90214] and current AHA/ACC 2024 Guidelines. Recommendation synthesized and verified against hospital formulary database.`;
    }

    setCopilotHistory((prev) => [...prev, { q, a: ans, latency: '180ms' }]);
    setCopilotQuery('');
  };

  const handleRapidIntakeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName) return;
    alert(`Rapid intake recorded for ${newPatientName} (${newPatientMrn || 'MRN-Auto'}). Dispatched to CICU Telemetry queue.`);
    setRapidIntakeModal(false);
    setNewPatientName('');
    setNewPatientMrn('');
  };

  // Filter assigned patients
  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      assignedSearch === '' ||
      p.name.toLowerCase().includes(assignedSearch.toLowerCase()) ||
      p.mrn.toLowerCase().includes(assignedSearch.toLowerCase()) ||
      p.bed.toLowerCase().includes(assignedSearch.toLowerCase());
    const matchesDivision =
      assignedDivision === 'All' ||
      (assignedDivision === 'Inpatient' && p.ward.includes('Inpatient')) ||
      (assignedDivision === 'Outpatient' && p.ward.includes('Outpatient'));
    const matchesTier = assignedTier === 'All' || p.tier.includes(assignedTier);
    return matchesSearch && matchesDivision && matchesTier;
  });

  return (
    <div className="flex flex-col w-full pb-16">
      <div className="px-4 sm:px-space-xl py-space-lg flex flex-col gap-space-lg">
        {/* Access Governance & RBAC Sentinel Banner */}
        <div className="w-full bg-surface-container rounded-xl p-space-md flex flex-wrap items-center justify-between gap-space-md shadow-xs border border-surface-container-high/60">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
            </div>
            <div>
              <div className="flex items-center gap-space-xs flex-wrap">
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  RBAC Enforcement Active: Attending Physician Clearance
                </span>
                <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-primary-fixed text-on-primary-fixed uppercase tracking-wider font-bold">
                  Level 4 Node
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Session Key: SEC-CARDIO-8812 • Biometric Signature Verified • Audit logging enabled per HIPAA Title II.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-space-sm text-label-sm font-label-sm flex-wrap">
            <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface-container-lowest text-on-surface shadow-xs border border-surface-container-high/40">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="font-mono">Zero-Trust Token Valid (52m)</span>
            </div>
            <button
              className="px-space-md py-1.5 rounded-lg bg-surface-container-high text-primary hover:bg-surface-container-highest transition-colors font-label-md text-label-md cursor-pointer font-semibold"
              onClick={() => setShowUnauthAlert(!showUnauthAlert)}
              type="button"
            >
              Simulate Unauthorized Ward Patient
            </button>
          </div>
        </div>

        {/* Simulated Unauthorized Alert Box */}
        {showUnauthAlert && (
          <div className="w-full bg-error-container text-on-error-container p-space-md rounded-xl flex items-center justify-between shadow-xs border border-error/20 animate-fade-in">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-error text-[24px]">lock_clock</span>
              <div>
                <div className="font-headline-sm text-headline-sm font-bold text-error">
                  Care Access Not Granted — Scope Restriction Active
                </div>
                <p className="font-body-sm text-body-sm">
                  You do not possess primary or consulting privileges for Patient Eleanor Vance (MRN-78190, Oncology Ward). Immediate RBAC block in effect.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-space-xs shrink-0 ml-2">
              <button
                className="px-space-md py-1.5 rounded-lg bg-surface-container-lowest text-error font-label-md text-label-md hover:bg-surface-container-low transition-colors cursor-pointer font-bold"
                onClick={() => alert('Administrative care grant request forwarded to Medical Staff Affairs.')}
                type="button"
              >
                Request Administrative Care Grant
              </button>
              <button
                className="p-1 rounded text-error hover:bg-surface-container-lowest cursor-pointer"
                onClick={() => setShowUnauthAlert(false)}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        )}

        {/* Physician Identity & Telemetry Overview Header */}
        <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-space-xl border border-surface-container-high/60">
          <div className="flex items-start gap-space-lg">
            <div className="relative">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-primary-container to-primary flex items-center justify-center text-white text-2xl font-bold shadow-md ring-2 ring-surface-container-high">
                SL
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary-container ring-2 ring-surface-container-lowest"></span>
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-space-sm">
                <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                  Dr. Sarah Lin, MD, FACC
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-label-md font-label-md bg-secondary-fixed text-on-secondary-fixed uppercase font-semibold">
                  Chief of Cardiology
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-label-md font-label-md bg-primary-fixed text-on-primary-fixed flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span> Active On-Call
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Cardiovascular Intensive Care Unit (CICU) & Outpatient Specialized Heart Center • Pager ID: #4409
              </p>
              <div className="flex flex-wrap items-center gap-space-lg pt-space-xs font-label-sm text-label-sm text-on-surface-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">calendar_today</span> Shift: 07:00 – 19:00
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">apartment</span> Pavillion D, Floor 4
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">wifi_channel</span> AI Telemetry Link: Synced
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-space-md">
            <div className="flex items-center gap-space-md p-space-sm px-space-md bg-surface-container-low rounded-xl border border-surface-container-high/60">
              <div className="text-right">
                <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-medium">
                  Today's Schedule
                </div>
                <div className="font-headline-sm text-headline-sm text-on-surface font-bold">8 Consults</div>
              </div>
              <div className="w-px h-8 bg-outline-variant"></div>
              <div className="text-right">
                <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-medium">
                  Critical Telemetry
                </div>
                <div className="font-headline-sm text-headline-sm text-error font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-error animate-ping"></span> 2 Alerts
                </div>
              </div>
              <div className="w-px h-8 bg-outline-variant"></div>
              <div className="text-right">
                <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-medium">
                  Ward Load
                </div>
                <div className="font-headline-sm text-headline-sm text-primary font-bold">14 Active</div>
              </div>
            </div>
            <button
              className="h-10 px-space-md rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary transition-colors flex items-center gap-space-xs shadow-xs cursor-pointer font-bold"
              onClick={() => setRapidIntakeModal(true)}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>New Rapid Intake</span>
            </button>
          </div>
        </div>

        {/* Metric Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {/* Card 1 */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs flex flex-col justify-between border border-surface-container-high/60">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                Today's Appointments
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">event_available</span>
              </div>
            </div>
            <div className="my-space-md flex items-baseline gap-space-sm">
              <span className="font-display text-display text-on-surface font-bold">6</span>
              <span className="font-body-md text-body-md text-on-surface-variant">/ 8 Completed</span>
            </div>
            <div className="space-y-1">
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary-container h-full rounded-full" style={{ width: '75%' }}></div>
              </div>
              <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant">
                <span>2 Remaining Today</span>
                <span className="text-primary font-bold">75% Concluded</span>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs flex flex-col justify-between border border-surface-container-high/60">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                Assigned Patients
              </span>
              <div className="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center text-on-secondary-container">
                <span className="material-symbols-outlined text-[18px]">group</span>
              </div>
            </div>
            <div className="my-space-md flex items-baseline gap-space-sm">
              <span className="font-display text-display text-on-surface font-bold">14</span>
              <span className="font-body-md text-body-md text-on-surface-variant">Active Charts</span>
            </div>
            <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary-container"></span> 9 Inpatients
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-secondary"></span> 5 Outpatients
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs flex flex-col justify-between border border-surface-container-high/60">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                Pending Lab Reviews
              </span>
              <div className="w-8 h-8 rounded-lg bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
                <span className="material-symbols-outlined text-[18px]">radiology</span>
              </div>
            </div>
            <div className="my-space-md flex items-baseline gap-space-sm">
              <span className="font-display text-display text-primary font-bold">3</span>
              <span className="font-body-md text-body-md text-on-surface-variant">Need Sign-off</span>
            </div>
            <div className="flex items-center justify-between font-label-sm text-label-sm">
              <span className="text-on-surface-variant">2 Cardiac Echo, 1 Troponin</span>
              <span className="text-error font-bold flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[14px]">timer</span> 42m avg
              </span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs flex flex-col justify-between border border-surface-container-high/60">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                Urgent Escalations
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-outline">
                <span className="material-symbols-outlined text-[18px]">notifications_active</span>
              </div>
            </div>
            <div className="my-space-md flex items-baseline gap-space-sm">
              <span className="font-display text-display text-on-surface font-bold">0</span>
              <span className="font-body-md text-body-md text-on-surface-variant">Unresolved</span>
            </div>
            <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
              <span className="text-primary font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span> Stable Ward Status
              </span>
              <span>Zero Code Blue</span>
            </div>
          </div>
        </div>

        {/* Main Workspace Area: Left Multi-Tab Grid (8 Cols) vs Right AI Co-Pilot Panel (4 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* LEFT: Primary Workspace Tabs */}
          <div className="lg:col-span-8 flex flex-col gap-space-lg min-w-0">
            {/* Navigation Tabs Bar */}
            <div className="bg-surface-container-lowest rounded-xl p-space-xs shadow-xs flex flex-wrap items-center justify-between gap-space-sm border border-surface-container-high/60">
              <div className="flex items-center gap-space-2xs flex-wrap">
                <button
                  className={`px-space-md py-2 rounded-lg font-label-lg text-label-lg flex items-center gap-space-xs transition-colors cursor-pointer ${
                    mainTab === 'schedule'
                      ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                  onClick={() => setMainTab('schedule')}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">schedule</span>
                  <span>Today's Schedule & Queue</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-surface-container-lowest text-primary text-label-sm font-bold ml-1">
                    2 Rem
                  </span>
                </button>

                <button
                  className={`px-space-md py-2 rounded-lg font-label-lg text-label-lg flex items-center gap-space-xs transition-colors cursor-pointer ${
                    mainTab === 'assigned'
                      ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                  onClick={() => setMainTab('assigned')}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">folder_shared</span>
                  <span>Assigned Patients (EHR)</span>
                </button>

                <button
                  className={`px-space-md py-2 rounded-lg font-label-lg text-label-lg flex items-center gap-space-xs transition-colors cursor-pointer ${
                    mainTab === 'detail'
                      ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                  onClick={() => setMainTab('detail')}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">clinical_notes</span>
                  <span>Patient Detail: John Doe</span>
                  <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                </button>
              </div>

              <div className="px-space-sm text-label-sm font-label-sm text-on-surface-variant flex items-center gap-1 font-medium">
                <span className="material-symbols-outlined text-[16px] text-primary">sync</span> Live EHR Stream
              </div>
            </div>

            {/* TAB 1: Today's Schedule & Patient Queue */}
            {mainTab === 'schedule' && (
              <div className="flex flex-col gap-space-md">
                <div className="bg-surface-container-lowest rounded-xl shadow-xs overflow-hidden border border-surface-container-high/60">
                  <div className="p-space-md flex flex-wrap items-center justify-between gap-space-md bg-surface-container-low border-b border-surface-container-high/40">
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                        Cardiology Clinical Daily Roster
                      </h2>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Scheduled visits, post-intervention telemetry, and consult evaluations for today.
                      </p>
                    </div>
                    <div className="flex items-center gap-space-xs">
                      <button
                        className="h-8 px-space-sm rounded-lg bg-surface-container-lowest text-on-surface text-label-sm font-label-sm hover:bg-surface transition-colors flex items-center gap-1 border border-surface-container-high/60 cursor-pointer font-medium"
                        type="button"
                        onClick={() => alert('Filter set to: Active Cardiology CICU cases.')}
                      >
                        <span className="material-symbols-outlined text-[16px]">filter_list</span> Filter Status
                      </button>
                      <button
                        className="h-8 px-space-sm rounded-lg bg-surface-container-lowest text-on-surface text-label-sm font-label-sm hover:bg-surface transition-colors flex items-center gap-1 border border-surface-container-high/60 cursor-pointer font-medium"
                        type="button"
                        onClick={() => window.print()}
                      >
                        <span className="material-symbols-outlined text-[16px]">print</span> Print Run Sheet
                      </button>
                    </div>
                  </div>

                  {/* Queue Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container font-label-md text-label-md text-on-surface-variant uppercase tracking-wider h-9">
                          <th className="px-space-md py-space-xs">Time</th>
                          <th className="px-space-md py-space-xs">Patient & MRN</th>
                          <th className="px-space-md py-space-xs">Visit / Acuity</th>
                          <th className="px-space-md py-space-xs">Status</th>
                          <th className="px-space-md py-space-xs text-right">Quick Actions</th>
                        </tr>
                      </thead>
                      <tbody className="font-body-md text-body-md text-on-surface divide-y divide-surface-container-low">
                        {/* Row 1: Selected Patient John Doe */}
                        <tr className="bg-surface-container-low/70 hover:bg-surface-container transition-colors">
                          <td className="px-space-md py-space-sm font-code-sm text-code-sm text-primary font-bold">
                            14:30 EST
                          </td>
                          <td className="px-space-md py-space-sm">
                            <div className="flex items-center gap-space-sm">
                              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary font-bold flex items-center justify-center text-label-sm font-label-sm">
                                JD
                              </div>
                              <div>
                                <div className="font-label-lg text-label-lg font-bold text-on-surface">
                                  John Doe
                                </div>
                                <div className="font-code-sm text-code-sm text-on-surface-variant">
                                  MRN-90214 • 58y M
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-space-md py-space-sm">
                            <div className="text-on-surface font-label-lg text-label-lg font-semibold">
                              Post-CABG Stent Consult
                            </div>
                            <div className="text-label-sm text-on-surface-variant">
                              CICU Stepdown Bed 412
                            </div>
                          </td>
                          <td className="px-space-md py-space-sm">
                            <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-secondary-container text-on-secondary-container font-bold">
                              In Consult Room
                            </span>
                          </td>
                          <td className="px-space-md py-space-sm text-right">
                            <div className="flex items-center justify-end gap-space-xs">
                              <button
                                className="px-2.5 py-1 rounded bg-primary-container text-on-primary font-label-sm text-label-sm hover:bg-primary transition-colors cursor-pointer font-bold shadow-xs"
                                onClick={() => setMainTab('detail')}
                                type="button"
                              >
                                Open EHR
                              </button>
                              <button
                                className="px-2.5 py-1 rounded bg-surface-container-highest text-on-surface font-label-sm text-label-sm hover:bg-surface-variant transition-colors cursor-pointer"
                                onClick={() => alert('Starting Telemetry Synchronized Consult for John Doe.')}
                                type="button"
                              >
                                Start Consult
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Row 2: Maria Chen */}
                        <tr className="bg-surface-container-lowest hover:bg-surface-container-low transition-colors">
                          <td className="px-space-md py-space-sm font-code-sm text-code-sm text-on-surface-variant font-medium">
                            15:15 EST
                          </td>
                          <td className="px-space-md py-space-sm">
                            <div className="flex items-center gap-space-sm">
                              <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container font-bold flex items-center justify-center text-label-sm font-label-sm">
                                MC
                              </div>
                              <div>
                                <div className="font-label-lg text-label-lg font-bold text-on-surface">
                                  Maria Chen
                                </div>
                                <div className="font-code-sm text-code-sm text-on-surface-variant">
                                  MRN-64201 • 64y F
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-space-md py-space-sm">
                            <div className="text-on-surface font-label-lg text-label-lg">
                              Atrial Fibrillation Follow-up
                            </div>
                            <div className="text-label-sm text-on-surface-variant">
                              Outpatient Clinic D
                            </div>
                          </td>
                          <td className="px-space-md py-space-sm">
                            <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-surface-container-high text-on-surface-variant font-medium">
                              Arrived (Vitals Done)
                            </span>
                          </td>
                          <td className="px-space-md py-space-sm text-right">
                            <div className="flex items-center justify-end gap-space-xs">
                              <button
                                className="px-2.5 py-1 rounded bg-surface-container text-on-surface font-label-sm text-label-sm hover:bg-surface-container-high transition-colors cursor-pointer"
                                onClick={() => alert('Loaded chart for Maria Chen (MRN-64201).')}
                                type="button"
                              >
                                Open EHR
                              </button>
                              <button
                                className="px-2.5 py-1 rounded bg-surface-container-highest text-on-surface font-label-sm text-label-sm hover:bg-surface-variant transition-colors cursor-pointer"
                                onClick={() => alert('Reschedule modal opened for Maria Chen.')}
                                type="button"
                              >
                                Reschedule
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Row 3: Completed Arthur Pendelton */}
                        <tr className="bg-surface-container-lowest opacity-75 hover:opacity-100 transition-opacity">
                          <td className="px-space-md py-space-sm font-code-sm text-code-sm text-outline">
                            13:00 EST
                          </td>
                          <td className="px-space-md py-space-sm">
                            <div className="flex items-center gap-space-sm">
                              <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant font-bold flex items-center justify-center text-label-sm font-label-sm">
                                AL
                              </div>
                              <div>
                                <div className="font-label-lg text-label-lg font-bold text-on-surface">
                                  Arthur Pendelton
                                </div>
                                <div className="font-code-sm text-code-sm text-on-surface-variant">
                                  MRN-33108 • 72y M
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-space-md py-space-sm">
                            <div className="text-on-surface font-label-lg text-label-lg">
                              Pre-Op TAVR Evaluation
                            </div>
                            <div className="text-label-sm text-on-surface-variant">
                              Cardiovascular Cath Lab
                            </div>
                          </td>
                          <td className="px-space-md py-space-sm">
                            <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-surface-container-highest text-on-surface">
                              Completed
                            </span>
                          </td>
                          <td className="px-space-md py-space-sm text-right">
                            <button
                              className="px-2.5 py-1 rounded bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm hover:bg-surface-container transition-colors cursor-pointer"
                              onClick={() => alert('Arthur Pendelton TAVR clearance approved. Sizing parameters stored in PACS.')}
                              type="button"
                            >
                              Review Summary
                            </button>
                          </td>
                        </tr>

                        {/* Row 4: Saanvi Kapoor */}
                        <tr className="bg-surface-container-lowest opacity-75 hover:opacity-100 transition-opacity">
                          <td className="px-space-md py-space-sm font-code-sm text-code-sm text-outline">
                            11:30 EST
                          </td>
                          <td className="px-space-md py-space-sm">
                            <div className="flex items-center gap-space-sm">
                              <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant font-bold flex items-center justify-center text-label-sm font-label-sm">
                                SK
                              </div>
                              <div>
                                <div className="font-label-lg text-label-lg font-bold text-on-surface">
                                  Saanvi Kapoor
                                </div>
                                <div className="font-code-sm text-code-sm text-on-surface-variant">
                                  MRN-41920 • 45y F
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-space-md py-space-sm">
                            <div className="text-on-surface font-label-lg text-label-lg">
                              Hypertrophic Cardiomyopathy Review
                            </div>
                            <div className="text-label-sm text-on-surface-variant">
                              Outpatient Clinic D
                            </div>
                          </td>
                          <td className="px-space-md py-space-sm">
                            <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-surface-container-highest text-on-surface">
                              Completed
                            </span>
                          </td>
                          <td className="px-space-md py-space-sm text-right">
                            <button
                              className="px-2.5 py-1 rounded bg-surface-container-low text-on-surface-variant font-label-sm text-label-sm hover:bg-surface-container transition-colors cursor-pointer"
                              onClick={() => alert('Saanvi Kapoor consult summary: Holter monitoring ordered for 48 hours.')}
                              type="button"
                            >
                              Review Summary
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="p-space-md bg-surface-container-lowest flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant border-t border-surface-container-low">
                    <span>Showing 4 of 8 scheduled appointments for Dr. Lin</span>
                    <button
                      className="text-primary font-bold hover:underline cursor-pointer"
                      onClick={() => alert('Displaying full 24-Hour Ward Roster for Cardiology Department.')}
                    >
                      View Full 24-Hour Ward Roster →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Assigned Patients (EHR) */}
            {mainTab === 'assigned' && (
              <div className="flex flex-col gap-space-md">
                <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs space-y-space-md border border-surface-container-high/60">
                  {/* Filter Bar */}
                  <div className="flex flex-col sm:flex-row items-center gap-space-md justify-between">
                    <div className="relative w-full sm:w-80">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
                        search
                      </span>
                      <input
                        className="w-full h-9 pl-9 pr-space-md bg-surface-container-low rounded-lg text-body-sm font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container border border-surface-container-high/60"
                        placeholder="Filter by Name, MRN, Bed..."
                        type="text"
                        value={assignedSearch}
                        onChange={(e) => setAssignedSearch(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-space-sm w-full sm:w-auto">
                      <select
                        className="h-9 px-space-sm bg-surface-container-low rounded-lg text-label-sm font-label-sm text-on-surface focus:outline-none border border-surface-container-high/60 cursor-pointer"
                        value={assignedDivision}
                        onChange={(e) => setAssignedDivision(e.target.value)}
                      >
                        <option value="All">All Divisions (Cardiology & CICU)</option>
                        <option value="Inpatient">CICU Inpatient Ward</option>
                        <option value="Outpatient">Outpatient Specialized Center</option>
                      </select>
                      <select
                        className="h-9 px-space-sm bg-surface-container-low rounded-lg text-label-sm font-label-sm text-on-surface focus:outline-none border border-surface-container-high/60 cursor-pointer"
                        value={assignedTier}
                        onChange={(e) => setAssignedTier(e.target.value)}
                      >
                        <option value="All">All Risk Tiers</option>
                        <option value="Tier 1">Tier 1 (High Risk)</option>
                        <option value="Tier 2">Tier 2 (Monitored)</option>
                        <option value="Tier 3">Tier 3 (Routine)</option>
                      </select>
                    </div>
                  </div>

                  {/* Patient List Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                    {filteredPatients.map((pt) => (
                      <div
                        key={pt.mrn}
                        className="p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex items-start justify-between gap-space-sm border border-surface-container-high/40"
                      >
                        <div className="flex items-start gap-space-sm">
                          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold font-label-lg text-label-lg shrink-0">
                            {pt.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .substring(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                                {pt.name}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-secondary-fixed text-on-secondary-fixed font-bold">
                                {pt.bed}
                              </span>
                            </div>
                            <div className="font-code-sm text-code-sm text-on-surface-variant">
                              {pt.mrn} • Age {pt.age}
                            </div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                              Diagnosis: {pt.diagnosis}
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-label-sm font-label-sm flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded font-bold ${
                                  pt.tier.includes('High Risk')
                                    ? 'bg-error-container text-on-error-container'
                                    : 'bg-surface-container text-on-surface'
                                }`}
                              >
                                {pt.tier}
                              </span>
                              {pt.echoLvef && (
                                <span className="text-on-surface-variant font-mono">
                                  Echo LVEF: {pt.echoLvef}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          className="px-space-sm py-1 rounded bg-surface-container-lowest hover:bg-primary-container hover:text-on-primary text-primary font-label-sm text-label-sm transition-colors shadow-xs whitespace-nowrap cursor-pointer border border-surface-container-high/60 font-semibold"
                          onClick={() => {
                            if (pt.mrn === 'MRN-90214') {
                              setMainTab('detail');
                            } else {
                              alert(`Accessing chart for ${pt.name} (${pt.mrn}). Primary Attending: ${pt.attending}`);
                            }
                          }}
                          type="button"
                        >
                          View Full Chart
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Authorized Clinical Detail (John Doe MRN-90214) */}
            {mainTab === 'detail' && (
              <div className="flex flex-col gap-space-md">
                {/* Active Patient Summary Banner */}
                <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md border border-surface-container-high/60">
                  <div className="flex items-center gap-space-md">
                    <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary font-bold flex items-center justify-center font-headline-sm text-headline-sm shadow-xs">
                      JD
                    </div>
                    <div>
                      <div className="flex items-center gap-space-sm flex-wrap">
                        <span className="font-headline-md text-headline-md font-bold text-on-surface">
                          John Doe
                        </span>
                        <span className="font-code-sm text-code-sm px-2 py-0.5 rounded bg-surface-container-low text-primary font-bold">
                          MRN-90214
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-label-sm font-label-sm bg-error-container text-on-error-container font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span> Telemetry Alert
                        </span>
                      </div>
                      <div className="font-body-sm text-body-sm text-on-surface-variant flex flex-wrap items-center gap-space-md mt-0.5">
                        <span>DOB: 12/04/1966 (58y)</span>
                        <span>Male</span>
                        <span>Bed 412 (CICU Stepdown)</span>
                        <span>Attending: Dr. Sarah Lin</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-space-xs w-full sm:w-auto">
                    <button
                      className="px-space-sm py-1.5 rounded-lg bg-surface-container-low text-on-surface font-label-sm text-label-sm hover:bg-surface-container transition-colors flex items-center gap-1 border border-surface-container-high/60 cursor-pointer font-medium"
                      onClick={() => window.print()}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">print</span> Summary
                    </button>
                    <button
                      className="px-space-sm py-1.5 rounded-lg bg-error-container text-on-error-container font-label-sm text-label-sm hover:bg-error/20 transition-colors flex items-center gap-1 cursor-pointer font-bold"
                      onClick={() => alert('Rapid Response Paged to CICU Stepdown Bed 412 for John Doe.')}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">emergency</span> Rapid Response Call
                    </button>
                  </div>
                </div>

                {/* Patient Sub-Tabs Bar */}
                <div className="bg-surface-container-lowest rounded-xl p-space-xs shadow-xs flex items-center gap-space-xs overflow-x-auto border border-surface-container-high/60">
                  <button
                    className={`px-space-md py-1.5 rounded-lg font-label-md text-label-md transition-colors cursor-pointer ${
                      patientSubTab === 'overview'
                        ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                    onClick={() => setPatientSubTab('overview')}
                    type="button"
                  >
                    Overview
                  </button>
                  <button
                    className={`px-space-md py-1.5 rounded-lg font-label-md text-label-md transition-colors cursor-pointer ${
                      patientSubTab === 'vitals'
                        ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                    onClick={() => setPatientSubTab('vitals')}
                    type="button"
                  >
                    Vitals & History
                  </button>
                  <button
                    className={`px-space-md py-1.5 rounded-lg font-label-md text-label-md transition-colors flex items-center gap-1 cursor-pointer ${
                      patientSubTab === 'reports'
                        ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                    onClick={() => setPatientSubTab('reports')}
                    type="button"
                  >
                    <span>Diagnostic Reports</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-label-sm font-bold">
                      2 New
                    </span>
                  </button>
                  <button
                    className={`px-space-md py-1.5 rounded-lg font-label-md text-label-md transition-colors flex items-center gap-1 cursor-pointer ${
                      patientSubTab === 'rx'
                        ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                    onClick={() => setPatientSubTab('rx')}
                    type="button"
                  >
                    <span>Prescription Pad</span>
                    <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                  </button>
                </div>

                {/* SUB-TAB 1: Overview */}
                {patientSubTab === 'overview' && (
                  <div className="flex flex-col gap-space-md">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs space-y-2 border border-surface-container-high/60">
                        <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                          Primary Diagnosis
                        </div>
                        <div className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          Coronary Artery Disease
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                          Triple-vessel CABG performed POD 4. LIMA to LAD, SVG to OM1, SVG to RCA. Hemodynamically improving with mild bradycardia.
                        </p>
                      </div>

                      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs space-y-2 border border-surface-container-high/60">
                        <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                          Telemetry Trend (24h)
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-headline-sm text-headline-sm text-error font-bold">
                            Sinus Bradycardia
                          </span>
                          <span className="font-code-sm text-code-sm text-on-surface-variant font-mono">
                            52 - 88 bpm
                          </span>
                        </div>
                        {/* Interactive ECG Waveform SVG */}
                        <div className="bg-surface-container-low p-2 rounded-lg">
                          <svg
                            className="w-full h-10 text-primary-container"
                            fill="none"
                            preserveAspectRatio="none"
                            viewBox="0 0 200 40"
                          >
                            <path
                              d="M0 20 L40 20 L48 5 L55 35 L62 10 L68 24 L75 20 L120 20 L128 4 L135 36 L142 12 L148 22 L155 20 L200 20"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                            ></path>
                          </svg>
                        </div>
                        <div className="font-label-sm text-label-sm text-on-surface-variant">
                          Isolated premature ventricular contractions noted at 04:12.
                        </div>
                      </div>

                      <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs space-y-2 border border-surface-container-high/60">
                        <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                          Allergies & Alerts
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                            Penicillin (Anaphylaxis)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface font-label-sm text-label-sm">
                            Contrast Dye (Mild rash)
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
                          DVT Prophylaxis: Enoxaparin 40mg SC daily active.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 2: Vitals & History */}
                {patientSubTab === 'vitals' && (
                  <div className="flex flex-col gap-space-md">
                    <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs border border-surface-container-high/60">
                      <h3 className="font-headline-sm text-headline-sm text-on-surface mb-space-sm font-bold">
                        Bedside Continuous Telemetry Feed
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
                        <div className="p-space-sm bg-surface-container-low rounded-lg border border-surface-container-high/40">
                          <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-medium">
                            Blood Pressure
                          </div>
                          <div className="font-headline-md text-headline-md font-bold text-on-surface">
                            114 / 72{' '}
                            <span className="font-label-sm text-label-sm text-on-surface-variant font-normal">
                              mmHg
                            </span>
                          </div>
                          <div className="font-label-sm text-label-sm text-primary font-bold">
                            MAP: 86 (Stable)
                          </div>
                        </div>

                        <div className="p-space-sm bg-surface-container-low rounded-lg border border-surface-container-high/40">
                          <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-medium">
                            Heart Rate
                          </div>
                          <div className="font-headline-md text-headline-md font-bold text-error">
                            58{' '}
                            <span className="font-label-sm text-label-sm text-on-surface-variant font-normal">
                              bpm
                            </span>
                          </div>
                          <div className="font-label-sm text-label-sm text-error font-bold">
                            Low Rate Alarm
                          </div>
                        </div>

                        <div className="p-space-sm bg-surface-container-low rounded-lg border border-surface-container-high/40">
                          <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-medium">
                            SpO2 (Room Air)
                          </div>
                          <div className="font-headline-md text-headline-md font-bold text-on-surface">
                            98%
                          </div>
                          <div className="font-label-sm text-label-sm text-primary font-bold">
                            Adequate oxygenation
                          </div>
                        </div>

                        <div className="p-space-sm bg-surface-container-low rounded-lg border border-surface-container-high/40">
                          <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-medium">
                            Body Temp
                          </div>
                          <div className="font-headline-md text-headline-md font-bold text-on-surface">
                            36.8°C{' '}
                            <span className="font-label-sm text-label-sm text-on-surface-variant font-normal">
                              Oral
                            </span>
                          </div>
                          <div className="font-label-sm text-label-sm text-primary font-bold">
                            Afebrile
                          </div>
                        </div>
                      </div>

                      {/* History Timeline */}
                      <div className="mt-space-lg space-y-space-sm">
                        <div className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          Clinical Milestones (Past 96 Hours)
                        </div>
                        <div className="border-l-2 border-primary-container pl-space-md space-y-space-md text-body-sm font-body-sm">
                          <div>
                            <span className="font-code-sm text-code-sm text-primary font-bold">
                              Today, 06:00 EST
                            </span>
                            <p className="text-on-surface font-medium">
                              Chest tubes removed by Cardiothoracic fellow. Minimal serosanguinous output.
                            </p>
                          </div>
                          <div>
                            <span className="font-code-sm text-code-sm text-on-surface-variant font-bold">
                              Yesterday, 14:00 EST
                            </span>
                            <p className="text-on-surface font-medium">
                              Transferred from CICU Pod B to Stepdown Bed 412. Tolerating oral clear liquids.
                            </p>
                          </div>
                          <div>
                            <span className="font-code-sm text-code-sm text-on-surface-variant font-bold">
                              3 Days Ago, 08:30 EST
                            </span>
                            <p className="text-on-surface font-medium">
                              Completed Off-Pump Coronary Artery Bypass x3. Weaned off CPB without inotropes.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 3: Diagnostic Reports & Mock Upload */}
                {patientSubTab === 'reports' && (
                  <div className="flex flex-col gap-space-md">
                    <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs space-y-space-md border border-surface-container-high/60">
                      <div className="flex flex-wrap items-center justify-between gap-space-sm">
                        <div>
                          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                            Diagnostic Imaging & Laboratory Panel
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            Validated PACS integration and automated DICOM radiologic intake.
                          </p>
                        </div>
                        <button
                          className="h-9 px-space-md rounded-lg bg-primary-container text-on-primary font-label-lg text-label-lg hover:bg-primary transition-colors flex items-center gap-space-xs shadow-xs cursor-pointer font-bold"
                          onClick={handleStartMockUpload}
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                          <span>Upload New Diagnostic File</span>
                        </button>
                      </div>

                      {/* Mock Upload Progress Box */}
                      {isUploading && (
                        <div className="p-space-md rounded-xl bg-surface-container-low space-y-2 border border-surface-container-high animate-fade-in">
                          <div className="flex items-center justify-between font-label-md text-label-md">
                            <span className="text-on-surface font-bold flex items-center gap-1.5">
                              {!uploadComplete && (
                                <span className="material-symbols-outlined text-[16px] text-primary animate-spin">
                                  refresh
                                </span>
                              )}
                              {uploadComplete && (
                                <span className="material-symbols-outlined text-[16px] text-primary">
                                  check_circle
                                </span>
                              )}
                              <span>
                                {uploadComplete
                                  ? 'Upload Complete: PostOp_Transthoracic_Echo_JohnDoe_0320.dcm'
                                  : 'Uploading: PostOp_Transthoracic_Echo_JohnDoe_0320.dcm'}
                              </span>
                            </span>
                            <span className="text-primary font-bold">{uploadPercent}%</span>
                          </div>
                          <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-primary-container h-full rounded-full transition-all duration-300"
                              style={{ width: `${uploadPercent}%` }}
                            ></div>
                          </div>
                          <p className="font-code-sm text-code-sm text-on-surface-variant">
                            Encrypting payload via TLS 1.3 • Generating DICOM SHA-256 Checksum...
                          </p>
                        </div>
                      )}

                      {/* Reports List */}
                      <div className="space-y-space-xs">
                        <div className="p-space-md rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-between gap-space-md border border-surface-container-high/40">
                          <div className="flex items-center gap-space-md">
                            <div className="w-10 h-10 rounded-lg bg-surface-container-highest text-primary flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[20px]">ecg_heart</span>
                            </div>
                            <div>
                              <div className="font-label-lg text-label-lg font-bold text-on-surface">
                                12-Lead Electrocardiogram (Resting)
                              </div>
                              <div className="font-body-sm text-body-sm text-on-surface-variant">
                                Normal sinus rhythm with rate 58 bpm, Q waves in III and aVF (prior inferior MI).
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-space-sm shrink-0">
                            <span className="px-2 py-0.5 rounded text-label-sm font-label-sm bg-surface-container-highest text-on-surface font-bold">
                              Reviewed
                            </span>
                            <button
                              className="px-2.5 py-1 rounded bg-surface-container-lowest text-primary hover:bg-surface font-label-sm text-label-sm shadow-xs cursor-pointer border border-surface-container-high"
                              onClick={() => alert('Opening DICOM tracing viewer for John Doe.')}
                              type="button"
                            >
                              View Tracing
                            </button>
                          </div>
                        </div>

                        <div className="p-space-md rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors flex items-center justify-between gap-space-md border border-surface-container-high/40">
                          <div className="flex items-center gap-space-md">
                            <div className="w-10 h-10 rounded-lg bg-surface-container-highest text-primary flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[20px]">monitor_heart</span>
                            </div>
                            <div>
                              <div className="font-label-lg text-label-lg font-bold text-on-surface">
                                Transthoracic Echocardiogram (Echo)
                              </div>
                              <div className="font-body-sm text-body-sm text-on-surface-variant">
                                LVEF estimated 35-40%. Hypokinesis of the inferolateral wall. Mild mitral regurgitation.
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-space-sm shrink-0">
                            <span className="px-2 py-0.5 rounded text-label-sm font-label-sm bg-tertiary-fixed text-on-tertiary-fixed font-bold">
                              Needs Sign-off
                            </span>
                            <button
                              className="px-2.5 py-1 rounded bg-primary-container text-on-primary hover:bg-primary font-label-sm text-label-sm shadow-xs cursor-pointer font-bold"
                              onClick={() => alert('Echo signed off and certified into chart by Dr. Sarah Lin.')}
                              type="button"
                            >
                              Review & Sign
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB-TAB 4: Structured Prescription Pad */}
                {patientSubTab === 'rx' && (
                  <div className="flex flex-col gap-space-md">
                    <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-xs space-y-space-md border border-surface-container-high/60">
                      <div className="flex items-center justify-between pb-space-xs border-b border-surface-container-high/40">
                        <div>
                          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                            Structured CPOE Prescription Pad
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            Formulary-checked electronic prescribing directly to Inpatient Hospital Pharmacy.
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-surface-container-low text-primary font-code-sm text-code-sm font-bold border border-surface-container-high">
                          Rx Protocol v4.1
                        </span>
                      </div>

                      {/* Formulary Search */}
                      <div className="relative space-y-1">
                        <label className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                          Medicine Name (Hospital Formulary)
                        </label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
                            medication
                          </span>
                          <input
                            className="w-full h-10 pl-9 pr-space-md bg-surface-container-low rounded-lg text-body-sm font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container border border-surface-container-high/60"
                            id="formularySearch"
                            placeholder="Type to search formulary (e.g. Lisinopril, Metoprolol, Atorvastatin)..."
                            type="text"
                            value={medSearch}
                            onFocus={() => setShowMedList(true)}
                            onChange={(e) => {
                              setMedSearch(e.target.value);
                              setShowMedList(true);
                            }}
                          />
                        </div>

                        {showMedList && (
                          <div className="p-space-xs bg-surface-container-lowest rounded-lg shadow-md space-y-1 mt-1 border border-surface-container-high z-10 relative">
                            {[
                              { name: 'Metoprolol Succinate ER 25mg Tab', status: 'In Stock (Tier 1)', color: 'text-primary' },
                              { name: 'Lisinopril 10mg Tab', status: 'In Stock (Tier 1)', color: 'text-primary' },
                              { name: 'Atorvastatin Calcium 40mg Tab', status: 'In Stock (Tier 1)', color: 'text-primary' },
                              { name: 'Spironolactone 25mg Tab', status: 'Requires K+ Monitoring', color: 'text-secondary' },
                            ].map((m) => (
                              <div
                                key={m.name}
                                className="px-space-sm py-1.5 rounded hover:bg-surface-container-low cursor-pointer flex items-center justify-between text-body-sm font-body-sm"
                                onClick={() => {
                                  setMedSearch(m.name);
                                  setShowMedList(false);
                                }}
                              >
                                <span className="font-medium text-on-surface">{m.name}</span>
                                <span className={`text-label-sm font-label-sm ${m.color} font-bold`}>
                                  {m.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Parameters Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                        <div className="space-y-1">
                          <label className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                            Dosage
                          </label>
                          <input
                            className="w-full h-9 px-space-sm bg-surface-container-low rounded-lg text-body-sm font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container border border-surface-container-high/60"
                            type="text"
                            value={dosage}
                            onChange={(e) => setDosage(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                            Frequency
                          </label>
                          <select
                            className="w-full h-9 px-space-sm bg-surface-container-low rounded-lg text-body-sm font-body-sm text-on-surface focus:outline-none border border-surface-container-high/60 cursor-pointer"
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value)}
                          >
                            <option>QD (Once Daily)</option>
                            <option>BID (Twice Daily)</option>
                            <option>TID (Three Times Daily)</option>
                            <option>PRN (As Needed)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                            Duration
                          </label>
                          <select
                            className="w-full h-9 px-space-sm bg-surface-container-low rounded-lg text-body-sm font-body-sm text-on-surface focus:outline-none border border-surface-container-high/60 cursor-pointer"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                          >
                            <option>7 Days (Inpatient Step)</option>
                            <option>14 Days</option>
                            <option>30 Days (Discharge Supply)</option>
                            <option>90 Days (Maintenance)</option>
                          </select>
                        </div>
                      </div>

                      {/* Doctor Clinical Notes */}
                      <div className="space-y-1">
                        <label className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                          Physician Clinical Rationale & Administration Instructions
                        </label>
                        <textarea
                          className="w-full p-space-sm bg-surface-container-low rounded-lg text-body-sm font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container border border-surface-container-high/60"
                          placeholder="Document clinical indication, titration targets, and monitoring instructions..."
                          rows={3}
                          value={rxNotes}
                          onChange={(e) => setRxNotes(e.target.value)}
                        />
                      </div>

                      {/* Interaction Engine Badge */}
                      <div className="p-space-sm rounded-lg bg-surface-container-low flex items-center justify-between text-label-sm font-label-sm border border-surface-container-high/40">
                        <div className="flex items-center gap-2 text-on-surface">
                          <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                          <span>
                            Formulary Interaction Engine: No severe DDI flags detected with current home medications.
                          </span>
                        </div>
                        <span className="text-primary font-bold">Approved Protocol</span>
                      </div>

                      {/* Digital Key Bar */}
                      <div className="flex flex-wrap items-center justify-between pt-space-xs gap-space-sm border-t border-surface-container-high/40">
                        <div className="flex items-center gap-space-xs text-label-sm font-label-sm text-on-surface-variant font-medium">
                          <span className="material-symbols-outlined text-[16px]">fingerprint</span>
                          <span>Digital Key: Dr. Sarah Lin (NPI: #1982736450)</span>
                        </div>
                        <div className="flex items-center gap-space-xs">
                          <button
                            className="px-space-md py-2 rounded-lg bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high transition-colors cursor-pointer"
                            type="button"
                            onClick={() => {
                              setMedSearch('');
                              setDosage('');
                              setRxNotes('');
                            }}
                          >
                            Clear Pad
                          </button>
                          <button
                            className={`px-space-xl py-2 rounded-lg font-label-lg text-label-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer font-bold ${
                              rxSigned
                                ? 'bg-primary text-on-primary'
                                : 'bg-primary-container text-on-primary hover:bg-primary'
                            }`}
                            onClick={handleSignPrescription}
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {rxSigned ? 'check' : 'draw'}
                            </span>
                            <span>{rxSigned ? 'Prescription Transmitted' : 'Sign & Transmit Prescription'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Dedicated 'Doctor AI Clinical Co-Pilot' Drawer/Panel (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-space-md">
            <div className="bg-surface-container-lowest rounded-xl shadow-xs overflow-hidden sticky top-20 border border-surface-container-high/60">
              {/* Co-Pilot Header */}
              <div className="p-space-md bg-surface-container-low flex items-center justify-between border-b border-surface-container-high/40">
                <div className="flex items-center gap-space-xs">
                  <div className="w-7 h-7 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px]">neurology</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      Doctor AI Clinical Co-Pilot
                    </h3>
                    <span className="font-label-sm text-label-sm text-primary font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
                      Autonomous Clinical Agent
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface text-label-sm font-label-sm font-medium">
                  Active EHR Sync
                </span>
              </div>

              {/* Suggested Doctor Prompts Chips */}
              <div className="p-space-md space-y-space-sm bg-surface-container-lowest">
                <div className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant flex items-center justify-between font-semibold">
                  <span>Suggested Clinical Queries</span>
                  <span className="material-symbols-outlined text-[16px] text-outline">auto_awesome</span>
                </div>
                <div className="flex flex-col gap-space-xs">
                  {[
                    { text: "Summarize John Doe's 6-month lipid trajectory", icon: 'query_stats' },
                    { text: 'Check DDI: Lisinopril + Spironolactone', icon: 'medication_liquid' },
                    { text: 'Draft discharge summary for Bed 402', icon: 'assignment_turned_in' },
                    { text: 'Hospital policy for post-op antibiotic prophylaxis', icon: 'policy' },
                  ].map((item) => (
                    <button
                      key={item.text}
                      className="text-left p-space-sm rounded-lg bg-surface-container-low hover:bg-surface-container text-body-sm font-body-sm text-on-surface transition-colors flex items-start gap-2 cursor-pointer border border-surface-container-high/30"
                      onClick={() => handleCopilotSend(item.text)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">
                        {item.icon}
                      </span>
                      <span>{item.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Agentic Reasoning Trace Container */}
              <div className="px-space-md py-space-sm bg-surface-container-low space-y-space-xs border-t border-b border-surface-container-high/40">
                <div className="flex items-center justify-between font-label-md text-label-md text-on-surface-variant font-semibold">
                  <span className="uppercase tracking-wider">Agentic Reasoning Trace</span>
                  <span className="font-code-sm text-code-sm text-primary font-bold">Latency: 180ms</span>
                </div>
                <div className="p-space-sm rounded-lg bg-surface-container-lowest space-y-2 font-code-sm text-code-sm text-on-surface border border-surface-container-high/40">
                  <div className="flex items-start gap-2 text-primary font-medium">
                    <span className="material-symbols-outlined text-[16px] mt-0.5">database</span>
                    <span>Accessing Authorized Patient EHR [MRN-90214]...</span>
                  </div>
                  <div className="flex items-start gap-2 text-secondary font-medium">
                    <span className="material-symbols-outlined text-[16px] mt-0.5">fact_check</span>
                    <span>Checking Hospital Formulary & Creatinine Clearances...</span>
                  </div>
                  <div className="flex items-start gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">auto_stories</span>
                    <div>
                      <p>Synthesizing clinical recommendation with source citations:</p>
                      <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-primary font-bold text-label-sm font-label-sm inline-block mt-1">
                        [Hospital Protocol Doc v2.4 • ACC/AHA Guideline 2023]
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic Copilot History */}
              {copilotHistory.length > 0 && (
                <div className="p-space-md space-y-2 max-h-48 overflow-y-auto border-b border-surface-container-high/40">
                  {copilotHistory.map((item, idx) => (
                    <div key={idx} className="p-2 bg-surface-container-low rounded-lg text-body-sm space-y-1">
                      <div className="font-semibold text-primary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">psychology</span>
                        <span>{item.q}</span>
                      </div>
                      <p className="text-on-surface text-xs leading-relaxed">{item.a}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Clinical Synthesis & Recommendation Display */}
              <div className="p-space-md space-y-space-sm bg-surface-container-lowest">
                <div className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant font-semibold">
                  Agent Synthesis
                </div>
                <div className="text-body-sm font-body-sm text-on-surface space-y-2 bg-surface-container-low p-space-sm rounded-lg border border-surface-container-high/40">
                  <p>
                    <strong>Recommendation for John Doe:</strong> Recent post-CABG troponin trend has plateaued (0.04 ng/mL). Potassium is 4.4 mEq/L.
                  </p>
                  <p>
                    Suggested optimization: Transition from IV metoprolol to oral{' '}
                    <strong>Metoprolol Succinate 25mg QD</strong>. Add high-intensity{' '}
                    <strong>Atorvastatin 80mg QD</strong> before discharge per secondary prevention protocol.
                  </p>
                </div>

                {/* Action Confirmation Card */}
                <div className="p-space-sm rounded-lg bg-surface-container-high space-y-2 border border-surface-container-highest">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                    <span className="font-label-lg text-label-lg font-bold text-on-surface">
                      Review & Sign Order
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Attending verification is mandatory before writing agent orders into John Doe's permanent medical chart.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      className={`flex-1 py-1.5 rounded-lg font-label-md text-label-md transition-colors font-bold text-center cursor-pointer shadow-xs ${
                        orderCommitted
                          ? 'bg-primary text-on-primary'
                          : 'bg-primary-container text-on-primary hover:bg-primary'
                      }`}
                      onClick={handleCommitAgentOrder}
                      type="button"
                    >
                      {orderCommitted ? '✓ Order Signed & Committed' : 'Sign & Commit to Chart'}
                    </button>
                    <button
                      className="px-space-sm py-1.5 rounded-lg bg-surface-container text-on-surface font-label-md text-label-md hover:bg-surface-variant transition-colors cursor-pointer"
                      onClick={() => {
                        setMainTab('detail');
                        setPatientSubTab('rx');
                      }}
                      type="button"
                    >
                      Modify
                    </button>
                  </div>
                </div>
              </div>

              {/* Co-Pilot Chat Prompt Input Field */}
              <div className="p-space-md bg-surface-container-low flex items-center gap-space-xs border-t border-surface-container-high/40">
                <input
                  className="flex-1 h-9 px-space-sm bg-surface-container-lowest rounded-lg text-body-sm font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary-container border border-surface-container-high/60"
                  placeholder="Ask AI Co-Pilot a clinical question..."
                  type="text"
                  value={copilotQuery}
                  onChange={(e) => setCopilotQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCopilotSend();
                  }}
                />
                <button
                  className="w-9 h-9 rounded-lg bg-primary-container text-on-primary flex items-center justify-center hover:bg-primary transition-colors shadow-xs cursor-pointer"
                  onClick={() => handleCopilotSend()}
                  type="button"
                  title="Submit Query"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rapid Intake Modal */}
      {rapidIntakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6 shadow-xl border border-surface-container-high space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
              <h3 className="font-headline-sm font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary">add_circle</span>
                <span>Rapid Intake Admission</span>
              </h3>
              <button onClick={() => setRapidIntakeModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleRapidIntakeSubmit} className="space-y-3 font-body-sm">
              <div>
                <label className="block font-semibold mb-1">Patient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Jennifer Alvarez"
                  className="w-full h-9 px-3 bg-surface-container-low rounded-lg border border-surface-container-high"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Medical Record Number (MRN)</label>
                <input
                  type="text"
                  placeholder="MRN-55410 (Leave blank for auto)"
                  className="w-full h-9 px-3 bg-surface-container-low rounded-lg border border-surface-container-high"
                  value={newPatientMrn}
                  onChange={(e) => setNewPatientMrn(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Triage Acuity Tier</label>
                <select
                  className="w-full h-9 px-3 bg-surface-container-low rounded-lg border border-surface-container-high"
                  value={newPatientAcuity}
                  onChange={(e) => setNewPatientAcuity(e.target.value)}
                >
                  <option value="ESI-1 Critical">ESI-1 Critical (Immediate ICU)</option>
                  <option value="ESI-2 Urgent">ESI-2 Urgent (Telemetry Monitoring)</option>
                  <option value="ESI-3 Moderate">ESI-3 Moderate (Stepdown)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-surface-container-low">
                <button
                  type="button"
                  onClick={() => setRapidIntakeModal(false)}
                  className="px-4 py-2 bg-surface-container rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-on-primary font-bold rounded-lg cursor-pointer"
                >
                  Confirm Intake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
