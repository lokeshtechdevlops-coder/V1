import React, { useState } from 'react';
import { AppRole } from '../../types';
import { DEMO_PRESETS } from '../../data/mockData';

interface AuthScreenProps {
  onLoginSuccess: (role: AppRole) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [selectedRoleKey, setSelectedRoleKey] = useState<'doc' | 'admin' | 'patient'>('doc');
  const [email, setEmail] = useState(DEMO_PRESETS.doc.email);
  const [password, setPassword] = useState(DEMO_PRESETS.doc.pass);
  const [showPassword, setShowPassword] = useState(false);
  const [trustWorkstation, setTrustWorkstation] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState<'privacy' | 'conduct' | null>(null);

  const handleRoleSelect = (key: 'doc' | 'admin' | 'patient') => {
    setSelectedRoleKey(key);
    const preset = DEMO_PRESETS[key];
    setEmail(preset.email);
    setPassword(preset.pass);
  };

  const handleAuthSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsVerifying(true);
    setFeedbackMessage('Verifying institutional token and initializing Agentic Assistant...');

    setTimeout(() => {
      setFeedbackMessage('Authorized. Redirecting to synchronized clinical environment...');
      setTimeout(() => {
        setIsVerifying(false);
        setFeedbackMessage(null);
        if (selectedRoleKey === 'doc') {
          onLoginSuccess('doctor');
        } else if (selectedRoleKey === 'admin') {
          onLoginSuccess('admin');
        } else {
          onLoginSuccess('patient');
        }
      }, 700);
    }, 850);
  };

  const handleForgotCredentials = () => {
    alert('Notice: Self-service credential dispatch forwarded to Assigned IT System Administrator (Ext. 4409).');
  };

  const currentPreset = DEMO_PRESETS[selectedRoleKey];

  return (
    <div className="w-full bg-surface min-h-screen flex items-center justify-center p-space-md sm:p-space-lg antialiased">
      <div className="flex flex-col w-full items-center justify-center py-space-xl px-margin-mobile md:px-margin max-w-4xl">
        <div className="w-full flex flex-col gap-space-lg">
          {/* Top System Telemetry / Status Pill */}
          <div className="flex items-center justify-between px-space-md py-space-xs bg-surface-container-low rounded-lg text-secondary text-label-md border border-surface-container-high/60 shadow-xs">
            <div className="flex items-center gap-space-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
              <span className="font-label-md tracking-wider uppercase text-on-surface-variant font-semibold">
                Core AI Orchestrator: Online
              </span>
              <span className="hidden sm:inline text-outline-variant">•</span>
              <span className="hidden sm:inline font-code-sm text-code-sm text-secondary">
                Latency 18ms
              </span>
            </div>
            <div className="flex items-center gap-space-sm font-label-md text-on-surface-variant font-medium">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              <span>256-Bit TLS Encrypted Session</span>
            </div>
          </div>

          {/* Main Card Container */}
          <div className="bg-surface-container-lowest shadow-xl rounded-xl p-space-xl md:p-space-2xl flex flex-col gap-space-xl border border-surface-container-high/50">
            {/* Brand & Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-lg bg-surface-container-low/50 p-space-md rounded-lg border border-surface-container-high/40">
              <div className="flex items-center gap-space-md">
                <div className="w-12 h-12 shrink-0 bg-primary-container rounded-lg p-2 flex items-center justify-center shadow-md">
                  <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="4" fill="#0369a1" />
                    <path d="M12 7v10M7 12h10" stroke="#ffffff" strokeWidth="2.5" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                      CareNexus
                    </span>
                    <span className="bg-primary text-on-primary font-label-sm text-label-sm px-1.5 py-0.5 rounded uppercase font-semibold">
                      Clinical OS
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Intelligent Healthcare & Clinical Agent Platform
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-space-xs text-secondary self-start md:self-auto bg-surface-container-lowest px-2.5 py-1 rounded-md border border-surface-container-high">
                <span className="material-symbols-outlined text-[16px] text-primary-container">
                  shield_with_heart
                </span>
                <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                  HIPAA Tier 4 Accredited
                </span>
              </div>
            </div>

            {/* Two Column Layout: Form & Quick Switcher */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
              {/* Left Column: Form & Credential Access (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col gap-space-lg">
                <div className="flex flex-col gap-space-2xs">
                  <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Sign in to Clinical Portal
                  </h1>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Access protected patient telemetry, diagnostic queues, and agentic summaries.
                  </p>
                </div>

                <form className="flex flex-col gap-space-md" onSubmit={handleAuthSubmit}>
                  {/* Email Field */}
                  <div className="flex flex-col gap-space-2xs">
                    <label
                      className="font-label-lg text-label-lg text-on-surface font-semibold flex items-center justify-between"
                      htmlFor="clinicalEmail"
                    >
                      <span>Work / Patient Email</span>
                      <span className="font-label-sm text-label-sm text-secondary font-normal">
                        NPI or Identity SSO
                      </span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3 text-secondary text-[18px] pointer-events-none">
                        mail
                      </span>
                      <input
                        className="w-full h-10 pl-10 pr-3 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline text-body-md font-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary-container transition-colors border border-surface-container-high/60"
                        id="clinicalEmail"
                        placeholder="name@carenexus-health.org"
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <p className="font-label-sm text-label-sm text-secondary">
                      Use your verified institutional credential or portal invite address.
                    </p>
                  </div>

                  {/* Password Field */}
                  <div className="flex flex-col gap-space-2xs">
                    <label
                      className="font-label-lg text-label-lg text-on-surface font-semibold flex items-center justify-between"
                      htmlFor="clinicalPass"
                    >
                      <span>Access Key / Password</span>
                      <button
                        type="button"
                        onClick={handleForgotCredentials}
                        className="font-label-sm text-label-sm text-primary-container hover:underline"
                      >
                        Forgot credentials?
                      </button>
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3 text-secondary text-[18px] pointer-events-none">
                        key
                      </span>
                      <input
                        className="w-full h-10 pl-10 pr-10 rounded-lg bg-surface-container-low text-on-surface placeholder:text-outline text-body-md font-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary-container transition-colors border border-surface-container-high/60"
                        id="clinicalPass"
                        placeholder="••••••••••••"
                        required
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        aria-label="Toggle password visibility"
                        className="absolute right-2.5 text-secondary hover:text-on-surface p-1 flex items-center justify-center transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Remember & Context Check */}
                  <div className="flex items-center justify-between pt-space-2xs">
                    <label className="flex items-center gap-space-xs cursor-pointer select-none">
                      <input
                        className="w-4 h-4 rounded text-primary-container focus:ring-0 bg-surface-container-low cursor-pointer accent-[#0369a1]"
                        id="rememberDevice"
                        type="checkbox"
                        checked={trustWorkstation}
                        onChange={(e) => setTrustWorkstation(e.target.checked)}
                      />
                      <span className="font-body-sm text-body-sm text-on-surface">
                        Trust this clinical workstation (8 hrs)
                      </span>
                    </label>
                    <span className="font-label-sm text-label-sm text-tertiary font-medium bg-tertiary-fixed px-2 py-0.5 rounded">
                      MFA Token Synced
                    </span>
                  </div>

                  {/* Submission CTA */}
                  <div className="flex flex-col gap-space-xs pt-space-xs">
                    <button
                      className="w-full h-11 bg-primary text-on-primary font-headline-sm text-headline-sm rounded-lg flex items-center justify-center gap-space-sm hover:opacity-95 active:scale-[0.99] transition-all shadow-md cursor-pointer disabled:opacity-70 font-semibold"
                      disabled={isVerifying}
                      type="submit"
                    >
                      <span className="material-symbols-outlined text-[18px]">lock_open</span>
                      <span>Sign In to Clinical Portal</span>
                    </button>

                    {feedbackMessage && (
                      <div className="text-center py-2 px-space-sm rounded bg-surface-container text-primary font-label-md text-label-md animate-fade-in border border-surface-container-highest">
                        {feedbackMessage}
                      </div>
                    )}
                  </div>
                </form>

                {/* SSO Alternative */}
                <div className="flex items-center justify-between gap-space-sm pt-space-xs text-secondary text-label-md">
                  <span className="h-[1px] bg-surface-container-high flex-1"></span>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                    Enterprise SSO
                  </span>
                  <span className="h-[1px] bg-surface-container-high flex-1"></span>
                </div>

                <div className="grid grid-cols-2 gap-space-sm">
                  <button
                    className="h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center justify-center gap-space-xs transition-colors border border-surface-container-high/60 cursor-pointer"
                    onClick={() => {
                      handleRoleSelect('doc');
                      handleAuthSubmit();
                    }}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary-container">
                      domain
                    </span>
                    <span>Hospital Epic / Cerner</span>
                  </button>
                  <button
                    className="h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center justify-center gap-space-xs transition-colors border border-surface-container-high/60 cursor-pointer"
                    onClick={() => {
                      handleRoleSelect('admin');
                      handleAuthSubmit();
                    }}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px] text-tertiary">
                      passkey
                    </span>
                    <span>SmartCard (PIV / CAC)</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Demo Accounts Switcher (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col gap-space-md p-space-md bg-surface-container-low rounded-xl border border-surface-container-high">
                <div className="flex items-center justify-between pb-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary-container text-[20px]">
                      smart_toy
                    </span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      Demo Quick Access
                    </span>
                  </div>
                  <span className="bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm px-2 py-0.5 rounded-full font-semibold">
                    Prototype Mode
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Select a verified stakeholder profile to auto-populate test credentials and assess
                  role-based agent workflows.
                </p>

                {/* Role Cards Group */}
                <div className="flex flex-col gap-space-sm">
                  {/* Doctor Card */}
                  <button
                    className={`role-card text-left p-space-sm rounded-lg transition-all flex flex-col gap-space-xs border cursor-pointer ${
                      selectedRoleKey === 'doc'
                        ? 'bg-surface-container shadow-md border-primary-container'
                        : 'bg-surface-container-lowest hover:bg-surface-container-low border-surface-container-high shadow-xs'
                    }`}
                    onClick={() => handleRoleSelect('doc')}
                    type="button"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-space-xs">
                        <div className="w-6 h-6 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-[14px]">stethoscope</span>
                        </div>
                        <span className="font-label-lg text-label-lg font-bold text-on-surface">
                          Physician / Doctor Portal
                        </span>
                      </div>
                      <span className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm px-1.5 py-0.5 rounded font-medium">
                        Cardiology
                      </span>
                    </div>
                    <div className="text-body-sm font-body-sm text-on-surface-variant pl-7">
                      <p className="font-semibold text-on-surface">Dr. Sarah Lin, MD</p>
                      <p className="text-secondary text-[11px] leading-tight mt-0.5">
                        Assigned telemetry feeds, acute orders, AI diagnosis summaries.
                      </p>
                    </div>
                  </button>

                  {/* Administrator Card */}
                  <button
                    className={`role-card text-left p-space-sm rounded-lg transition-all flex flex-col gap-space-xs border cursor-pointer ${
                      selectedRoleKey === 'admin'
                        ? 'bg-surface-container shadow-md border-primary-container'
                        : 'bg-surface-container-lowest hover:bg-surface-container-low border-surface-container-high shadow-xs'
                    }`}
                    onClick={() => handleRoleSelect('admin')}
                    type="button"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-space-xs">
                        <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center text-secondary">
                          <span className="material-symbols-outlined text-[14px]">
                            admin_panel_settings
                          </span>
                        </div>
                        <span className="font-label-lg text-label-lg font-bold text-on-surface">
                          Hospital Administrator
                        </span>
                      </div>
                      <span className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm px-1.5 py-0.5 rounded font-medium">
                        Ops & Gov
                      </span>
                    </div>
                    <div className="text-body-sm font-body-sm text-on-surface-variant pl-7">
                      <p className="font-semibold text-on-surface">Admin Marcus Vance</p>
                      <p className="text-secondary text-[11px] leading-tight mt-0.5">
                        AI knowledge bases, hospital capacity, governance audit logs.
                      </p>
                    </div>
                  </button>

                  {/* Patient Card */}
                  <button
                    className={`role-card text-left p-space-sm rounded-lg transition-all flex flex-col gap-space-xs border cursor-pointer ${
                      selectedRoleKey === 'patient'
                        ? 'bg-surface-container shadow-md border-primary-container'
                        : 'bg-surface-container-lowest hover:bg-surface-container-low border-surface-container-high shadow-xs'
                    }`}
                    onClick={() => handleRoleSelect('patient')}
                    type="button"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-space-xs">
                        <div className="w-6 h-6 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary">
                          <span className="material-symbols-outlined text-[14px]">person</span>
                        </div>
                        <span className="font-label-lg text-label-lg font-bold text-on-surface">
                          Patient Portal
                        </span>
                      </div>
                      <span className="bg-surface-container text-on-surface-variant font-label-sm text-label-sm px-1.5 py-0.5 rounded font-medium">
                        MRN-90214
                      </span>
                    </div>
                    <div className="text-body-sm font-body-sm text-on-surface-variant pl-7">
                      <p className="font-semibold text-on-surface">John Doe</p>
                      <p className="text-secondary text-[11px] leading-tight mt-0.5">
                        Cardiology follow-up, vitals logs, personalized AI health companion.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Quick Launch Active Role Trigger */}
                <button
                  className="mt-space-2xs w-full py-2.5 px-space-md bg-surface-container text-primary-container hover:bg-primary-container hover:text-on-primary font-label-lg text-label-lg rounded-lg font-semibold flex items-center justify-center gap-space-xs transition-colors cursor-pointer border border-primary-fixed shadow-sm"
                  onClick={() => handleAuthSubmit()}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">bolt</span>
                  <span>{currentPreset.label}</span>
                </button>
              </div>
            </div>

            {/* Trust, Agentic Guardrails & Compliance Footer */}
            <div className="pt-space-md bg-surface-container-low/40 p-space-md rounded-lg flex flex-col md:flex-row items-center justify-between gap-space-sm text-secondary text-body-sm font-body-sm border border-surface-container-high/30">
              <div className="flex items-center flex-wrap gap-x-space-md gap-y-space-xs">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[16px] text-primary">
                    verified_user
                  </span>
                  <span>HIPAA Compliant</span>
                </div>
                <span className="hidden md:inline">•</span>
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">
                    psychology
                  </span>
                  <span>Agentic AI Guardrails Active</span>
                </div>
                <span className="hidden md:inline">•</span>
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    policy
                  </span>
                  <span>Role-Based Access Control (RBAC) Enforced</span>
                </div>
              </div>
              <div className="flex items-center gap-space-sm font-code-sm text-code-sm text-on-surface-variant font-medium">
                <span>Cluster: US-EAST-MED-04</span>
                <span>v4.2.1-clinical</span>
              </div>
            </div>
          </div>

          {/* Help & Assistance Row */}
          <div className="flex items-center justify-between px-space-sm font-body-sm text-body-sm text-secondary">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px]">contact_support</span>
              <span>
                Need clinical helpdesk support? Call{' '}
                <strong className="text-on-surface font-semibold">Ext. 4409</strong> (Emergency Triage Ops)
              </span>
            </div>
            <div className="flex items-center gap-space-md">
              <button
                type="button"
                className="hover:text-on-surface hover:underline cursor-pointer"
                onClick={() => setShowPolicyModal('privacy')}
              >
                Privacy Protocol
              </button>
              <button
                type="button"
                className="hover:text-on-surface hover:underline cursor-pointer"
                onClick={() => setShowPolicyModal('conduct')}
              >
                Clinician Code of Conduct
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Protocol Modals */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-surface-container-high">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-low">
              <h3 className="font-headline-sm font-bold text-on-surface">
                {showPolicyModal === 'privacy'
                  ? 'CareNexus Institutional Privacy Protocol'
                  : 'Clinician Code of Conduct & Agentic AI Policy'}
              </h3>
              <button
                onClick={() => setShowPolicyModal(null)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="text-body-sm text-on-surface-variant space-y-2 max-h-72 overflow-y-auto">
              {showPolicyModal === 'privacy' ? (
                <>
                  <p>
                    All patient telemetry, continuous monitoring recordings, and diagnostic EHR
                    documents stored within CareNexus are protected by 256-bit AES encryption at rest
                    and TLS 1.3 in transit.
                  </p>
                  <p>
                    Access complies with HIPAA Security Title II and SOC-2 Type II standards.
                    Zero-Trust session tokens expire automatically after 8 hours of inactivity.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Autonomous Clinical Copilots operate under Attending Physician Oversight. All
                    agent-synthesized drug orders, dose titrations, and discharge plans require explicit
                    attending physician verification and digital signature.
                  </p>
                  <p>
                    Privilege overrides (Emergency Break-Glass) trigger immediate high-priority audit
                    telemetry dispatches to the Chief Operations Officer.
                  </p>
                </>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPolicyModal(null)}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md font-semibold"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
