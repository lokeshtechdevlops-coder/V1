import React, { useState, useRef } from 'react';
import {
  Appointment,
  Prescription,
  MedicalReport,
  HospitalNotification,
} from '../../types';

interface PatientPortalProps {
  appointments: Appointment[];
  onAddAppointment: (apt: Appointment) => void;
  onCancelAppointment: (id: string) => void;
  prescriptions: Prescription[];
  reports: MedicalReport[];
  notifications: HospitalNotification[];
  onMarkNotificationsRead: () => void;
  onOpenCopilot: () => void;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({
  appointments,
  onAddAppointment,
  onCancelAppointment,
  prescriptions,
  reports,
  notifications,
  onMarkNotificationsRead,
  onOpenCopilot,
}) => {
  // Booking Wizard Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookDept, setBookDept] = useState('Cardiology');
  const [bookDoctor, setBookDoctor] = useState('Dr. Sarah Lin');
  const [bookSlot, setBookSlot] = useState('Oct 26 - 11:00 AM');
  const [bookReason, setBookReason] = useState('Routine blood pressure checkup and medication review');

  // Fast Slot Finder Inline State
  const [selectedSpecialty, setSelectedSpecialty] = useState('Cardiology');
  const [selectedFastSlot, setSelectedFastSlot] = useState('10:30 AM');

  // Report Viewer Modal
  const [activeReport, setActiveReport] = useState<MedicalReport | null>(null);

  // Pay Invoice Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [invoicePaid, setInvoicePaid] = useState(false);

  // Agentic AI Chat State
  const [aiQuery, setAiQuery] = useState('');
  const [aiHistory, setAiHistory] = useState<Array<{ sender: 'user' | 'agent'; text: string; time: string }>>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Refill request state
  const [refillStatus, setRefillStatus] = useState<string | null>(null);

  const handleBookingSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      doctorName: bookDoctor,
      specialistTitle: bookDept === 'Cardiology' ? 'Cardiology Specialist' : `${bookDept} Specialist`,
      department: bookDept,
      suite: 'Suite 304',
      dateStr: bookSlot.split(' - ')[0] || 'Upcoming',
      timeStr: bookSlot.split(' - ')[1] || '11:00 AM',
      status: 'Confirmed',
      room: 'Room 304',
    };
    onAddAppointment(newApt);
    setShowBookingModal(false);
    alert(`Appointment successfully confirmed with ${bookDoctor} for ${bookSlot}! Added to your calendar and EHR record.`);
  };

  const handleFastSlotConfirm = () => {
    const newApt: Appointment = {
      id: `apt-${Date.now()}`,
      doctorName: 'Dr. Sarah Lin',
      specialistTitle: 'Cardiovascular Lead',
      department: selectedSpecialty,
      suite: 'Suite 304',
      dateStr: 'Tomorrow, Oct 25',
      timeStr: selectedFastSlot,
      status: 'Confirmed',
      room: 'Room 304',
    };
    onAddAppointment(newApt);
    alert(`Appointment booked for Tomorrow at ${selectedFastSlot} with Dr. Sarah Lin.`);
  };

  const handleRequestRefill = (medName: string) => {
    setRefillStatus(`Refill request for ${medName} submitted to Main Hospital Dispensary.`);
    setTimeout(() => {
      setRefillStatus(null);
    }, 4000);
  };

  const fillAIQuery = (text: string) => {
    setAiQuery(text);
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  };

  const handleAgentChat = (e: React.FormEvent) => {
    e.preventDefault();
    const q = aiQuery.trim();
    if (!q) return;

    setAiHistory((prev) => [...prev, { sender: 'user', text: q, time: 'Just now' }]);
    setAiQuery('');
    setIsAiThinking(true);

    setTimeout(() => {
      let reply = '';
      const lower = q.toLowerCase();
      if (lower.includes('lipid') || lower.includes('blood') || lower.includes('panel')) {
        reply = 'Summary: Your Lipid Panel completed on Oct 23 showed Total Cholesterol at 178 mg/dL, HDL at 52 mg/dL, and LDL at 98 mg/dL. All lipid markers are fully within target guidelines under Dr. Lin’s protocol.';
      } else if (lower.includes('lisinopril')) {
        reply = 'Medication Guide: Lisinopril 10mg is prescribed for blood pressure regulation. Take 1 tablet every morning with water. Common mild symptoms include a dry cough or mild dizziness upon standing. Contact Dr. Lin if persistent.';
      } else if (lower.includes('slot') || lower.includes('lin') || lower.includes('appointment')) {
        reply = 'Scheduling: Dr. Sarah Lin has immediate availability on Thursday, Oct 26 at 11:00 AM and Friday, Oct 27 at 2:00 PM in Suite 304. Would you like me to reserve the 11:00 AM slot for you?';
      } else if (lower.includes('visiting') || lower.includes('hour') || lower.includes('ward')) {
        reply = 'Hospital Policy: Visiting hours for Inpatient Ward 4 are 10:00 AM – 8:00 PM daily. Please present your visitor wristband or QR pass at the west nurse reception desk.';
      } else {
        reply = `CareNexus Agent Response: Query verified against hospital records for John Doe (MRN-90214). Your telemetry and vital trends (BP 118/76 mmHg, Pulse 68 bpm) remain stable. All home prescriptions are verified synchronized with the hospital pharmacy.`;
      }

      setAiHistory((prev) => [...prev, { sender: 'agent', text: reply, time: 'Just now' }]);
      setIsAiThinking(false);
    }, 600);
  };

  const handlePayInvoice = () => {
    setInvoicePaid(true);
    setShowPaymentModal(false);
    alert('Payment of $45.00 copay successfully processed via Hospital Gateway. Receipt #INV-88902 emailed.');
  };

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Patient Context Header Banner */}
      <section className="p-4 sm:p-space-xl pb-space-lg">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-surface-container-high via-surface-container to-surface-container-low p-space-lg sm:p-space-xl shadow-xs border border-surface-container-high/60">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary-fixed-dim/20 blur-3xl pointer-events-none"></div>

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-lg">
            <div className="space-y-space-xs">
              <div className="flex items-center gap-space-sm flex-wrap">
                <span className="inline-flex items-center gap-space-2xs px-space-sm py-space-2xs rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-semibold">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  EHR CONNECTED
                </span>
                <span className="inline-flex items-center px-space-sm py-space-2xs rounded-full bg-surface-container-highest text-on-surface-variant font-code-sm text-code-sm font-semibold">
                  MRN-90214
                </span>
                <span className="inline-flex items-center px-space-sm py-space-2xs rounded-full bg-surface-container-highest text-primary font-label-md text-label-md font-bold">
                  Blood: A+
                </span>
                <span className="inline-flex items-center px-space-sm py-space-2xs rounded-full bg-surface-container-highest text-on-surface-variant font-label-md text-label-md">
                  Age: 48 yrs
                </span>
              </div>
              <h1 className="font-display text-display text-on-surface tracking-tight font-bold">
                Good morning, John Doe
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[16px] text-primary">clinical_notes</span>
                Primary Physician:{' '}
                <span className="text-on-surface font-semibold">Dr. Sarah Lin, MD</span> (Cardiovascular Science)
              </p>
            </div>

            {/* Latest Vitals Quick Pill Bar */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-space-sm bg-surface-container-lowest/90 backdrop-blur-md p-space-md rounded-xl shadow-xs border border-surface-container-high/60">
              <div className="flex items-center gap-space-sm pr-space-md border-r border-surface-container-high/60">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">ecg_heart</span>
                </div>
                <div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-medium">
                    Blood Pressure
                  </div>
                  <div className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    118/76{' '}
                    <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">
                      mmHg
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-space-sm px-space-md border-r border-surface-container-high/60">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined text-[20px]">favorite</span>
                </div>
                <div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-medium">
                    Pulse
                  </div>
                  <div className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    68{' '}
                    <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">
                      bpm
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-space-sm pl-space-md">
                <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[20px]">air</span>
                </div>
                <div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant uppercase font-medium">
                    SpO2
                  </div>
                  <div className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    99%{' '}
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-normal">
                      Room air
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Action Navigation Toolbar */}
      <section className="px-4 sm:px-space-xl pb-space-lg">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md">
          <button
            className="flex items-center justify-center gap-space-sm h-12 px-space-md rounded-xl bg-primary text-on-primary shadow-sm hover:bg-on-primary-fixed-variant transition-all group cursor-pointer font-semibold"
            onClick={() => setShowBookingModal(true)}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110">
              calendar_month
            </span>
            <span className="font-label-lg text-label-lg font-semibold">Book Appointment</span>
          </button>

          <a
            className="flex items-center justify-center gap-space-sm h-12 px-space-md rounded-xl bg-surface-container-lowest text-on-surface shadow-xs hover:bg-surface-container-low transition-all group border border-surface-container-high/60 font-semibold"
            href="#lab-reports-section"
          >
            <span className="material-symbols-outlined text-[20px] text-primary transition-transform group-hover:scale-110">
              folder_supervised
            </span>
            <span className="font-label-lg text-label-lg font-semibold">View Lab Reports</span>
          </a>

          <a
            className="flex items-center justify-center gap-space-sm h-12 px-space-md rounded-xl bg-surface-container-lowest text-on-surface shadow-xs hover:bg-surface-container-low transition-all group border border-surface-container-high/60 font-semibold"
            href="#prescriptions-section"
          >
            <span className="material-symbols-outlined text-[20px] text-tertiary transition-transform group-hover:scale-110">
              pill
            </span>
            <span className="font-label-lg text-label-lg font-semibold">Current Prescriptions</span>
          </a>

          <button
            className="flex items-center justify-center gap-space-sm h-12 px-space-md rounded-xl bg-primary-fixed text-on-primary-fixed shadow-xs hover:bg-primary-fixed-dim transition-all group cursor-pointer font-bold border border-primary-fixed-dim"
            onClick={() => {
              if (chatInputRef.current) {
                chatInputRef.current.focus();
                chatInputRef.current.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px] text-primary-container transition-transform group-hover:rotate-12">
              smart_toy
            </span>
            <span className="font-label-lg text-label-lg font-bold">Ask CareNexus AI</span>
          </button>
        </div>
      </section>

      {/* 4-Column Key Metric Summary Cards */}
      <section className="px-4 sm:px-space-xl pb-space-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
          {/* Next Appointment */}
          <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-xs border border-surface-container-high/60 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="space-y-space-2xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                  Next Appointment
                </span>
                <div className="font-headline-md text-headline-md text-on-surface font-bold">
                  Tomorrow, 10:30 AM
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">schedule</span>
              </div>
            </div>
            <div className="mt-space-md pt-space-xs flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm border-t border-surface-container-low">
              <span>Dr. Sarah Lin (Cardiology)</span>
              <span className="font-semibold text-primary">Room 304</span>
            </div>
          </div>

          {/* Recent Reports */}
          <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-xs border border-surface-container-high/60 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="space-y-space-2xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                  Recent Diagnostic
                </span>
                <div className="font-headline-md text-headline-md text-on-surface font-bold">
                  Cardiac Lipid Panel
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-[20px]">monitor_heart</span>
              </div>
            </div>
            <div className="mt-space-md pt-space-xs flex items-center justify-between font-body-sm text-body-sm border-t border-surface-container-low">
              <span className="inline-flex items-center px-space-xs py-space-2xs rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold">
                Normal Results
              </span>
              <span className="text-on-surface-variant">Issued 2 days ago</span>
            </div>
          </div>

          {/* Active Prescriptions */}
          <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-xs border border-surface-container-high/60 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="space-y-space-2xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                  Pharmacy Status
                </span>
                <div className="font-headline-md text-headline-md text-on-surface font-bold">
                  {prescriptions.length} Active Regimens
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[20px]">medication_liquid</span>
              </div>
            </div>
            <div className="mt-space-md pt-space-xs flex items-center justify-between font-body-sm text-body-sm text-on-surface-variant truncate border-t border-surface-container-low">
              <span className="truncate">Atorvastatin, Lisinopril, Metoprolol</span>
              <span className="font-label-sm text-label-sm text-primary font-bold shrink-0 ml-space-xs">
                All Sync'd
              </span>
            </div>
          </div>

          {/* Outstanding Copay / Balance */}
          <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-xs border border-surface-container-high/60 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="space-y-space-2xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                  Patient Balance
                </span>
                <div className="font-headline-md text-headline-md text-on-surface font-bold">
                  {invoicePaid ? '$0.00' : '$45.00'}{' '}
                  <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">
                    Copay
                  </span>
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              </div>
            </div>
            <div className="mt-space-md pt-space-xs flex items-center justify-between font-body-sm text-body-sm border-t border-surface-container-low">
              <span className="text-on-surface-variant">
                {invoicePaid ? 'Paid in Full' : 'Due Oct 31, 2024'}
              </span>
              {!invoicePaid ? (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="font-label-sm text-label-sm font-bold text-primary hover:text-on-primary-fixed-variant transition-colors flex items-center gap-space-2xs cursor-pointer"
                >
                  <span>Pay Invoice</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              ) : (
                <span className="text-primary font-label-sm font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check</span> Receipt #889
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Clinical Grid (7 cols / 5 cols) */}
      <section className="px-4 sm:px-space-xl pb-space-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          {/* LEFT COLUMN: APPOINTMENTS & MEDICAL RECORDS (7 cols) */}
          <div className="lg:col-span-7 space-y-space-xl">
            {/* Upcoming & Past Appointments Module */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-xs border border-surface-container-high/60">
              <div className="flex items-center justify-between pb-space-md">
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Upcoming & Past Appointments
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Verified hospital bookings synchronized with patient calendar
                  </p>
                </div>
                <button
                  className="px-space-md py-space-xs rounded-lg bg-surface-container-low text-primary hover:bg-surface-container font-label-md text-label-md flex items-center gap-space-xs transition-colors cursor-pointer border border-surface-container-high/60 font-semibold"
                  onClick={() => setShowBookingModal(true)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>New Visit</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md">
                      <th className="py-space-xs px-space-sm font-semibold">Specialist / Department</th>
                      <th className="py-space-xs px-space-sm font-semibold">Date & Time</th>
                      <th className="py-space-xs px-space-sm font-semibold">Status</th>
                      <th className="py-space-xs px-space-sm font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low font-body-sm text-body-sm">
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className="py-space-md px-space-sm">
                          <div className="font-label-lg text-label-lg font-bold text-on-surface">
                            {apt.doctorName}
                          </div>
                          <div className="text-on-surface-variant font-body-sm text-body-sm">
                            {apt.department} • {apt.suite}
                          </div>
                        </td>
                        <td className="py-space-md px-space-sm">
                          <div className="text-on-surface font-semibold">{apt.dateStr}</div>
                          <div className="text-on-surface-variant">{apt.timeStr}</div>
                        </td>
                        <td className="py-space-md px-space-sm">
                          {apt.status === 'Confirmed' && (
                            <span className="inline-flex items-center gap-space-2xs px-space-sm py-space-2xs rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                              Confirmed
                            </span>
                          )}
                          {apt.status === 'Scheduled' && (
                            <span className="inline-flex items-center gap-space-2xs px-space-sm py-space-2xs rounded-full bg-surface-container text-secondary font-label-sm text-label-sm font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block"></span>
                              Scheduled
                            </span>
                          )}
                          {apt.status === 'Completed' && (
                            <span className="inline-flex items-center gap-space-2xs px-space-sm py-space-2xs rounded-full bg-surface-container text-outline font-label-sm text-label-sm font-bold">
                              <span className="material-symbols-outlined text-[14px]">check</span>
                              Completed
                            </span>
                          )}
                        </td>
                        <td className="py-space-md px-space-sm text-right space-x-space-xs whitespace-nowrap">
                          {apt.status !== 'Completed' ? (
                            <>
                              <button
                                className="p-space-xs rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                                title="Add to Calendar"
                                onClick={() => alert(`Added ${apt.doctorName} on ${apt.dateStr} to Google Calendar sync.`)}
                              >
                                <span className="material-symbols-outlined text-[16px]">event</span>
                              </button>
                              <button
                                className="p-space-xs rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                                title="Reschedule"
                                onClick={() => {
                                  setShowBookingModal(true);
                                  setBookDoctor(apt.doctorName);
                                }}
                              >
                                <span className="material-symbols-outlined text-[16px]">edit_calendar</span>
                              </button>
                              <button
                                className="p-space-xs rounded hover:bg-surface-container text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                                title="Cancel"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to cancel appointment with ${apt.doctorName}?`)) {
                                    onCancelAppointment(apt.id);
                                  }
                                }}
                              >
                                <span className="material-symbols-outlined text-[16px]">cancel</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => alert(`Consultation Summary: Visited ${apt.doctorName} on ${apt.dateStr}. Vitals verified nominal. Next follow-up recommended in 3 months.`)}
                              className="px-space-sm py-space-2xs rounded bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm transition-colors cursor-pointer"
                            >
                              Summary
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Inline Guided Booking Workflow Preview Card */}
            <div className="rounded-xl bg-surface-container-low p-space-lg shadow-xs border border-surface-container-high/60">
              <div className="flex items-center justify-between pb-space-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">quick_reference</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Book Next In-Clinic Consultation
                  </h3>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                  Fast Slot Finder
                </span>
              </div>

              {/* Step Progression Wizard Bar */}
              <div className="grid grid-cols-4 gap-space-xs py-space-sm">
                <div className="flex flex-col gap-space-2xs">
                  <div className="h-1 rounded-full bg-primary"></div>
                  <span className="font-label-sm text-label-sm text-primary font-bold">1. Department</span>
                </div>
                <div className="flex flex-col gap-space-2xs">
                  <div className="h-1 rounded-full bg-primary"></div>
                  <span className="font-label-sm text-label-sm text-primary font-bold">2. Doctor</span>
                </div>
                <div className="flex flex-col gap-space-2xs">
                  <div className="h-1 rounded-full bg-surface-container-highest"></div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">3. Slot</span>
                </div>
                <div className="flex flex-col gap-space-2xs">
                  <div className="h-1 rounded-full bg-surface-container-highest"></div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">4. Confirm</span>
                </div>
              </div>

              {/* Department Selector Chips */}
              <div className="pt-space-sm space-y-space-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                  Selected Specialty:
                </span>
                <div className="flex flex-wrap gap-space-xs">
                  {['Cardiology', 'Neurology', 'Orthopedics', 'General Care'].map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setSelectedSpecialty(dept)}
                      className={`px-space-sm py-space-xs rounded-lg font-label-md text-label-md flex items-center gap-space-2xs transition-colors cursor-pointer ${
                        selectedSpecialty === dept
                          ? 'bg-primary text-on-primary font-bold'
                          : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-surface-container-high/60'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {dept === 'Cardiology'
                          ? 'cardiology'
                          : dept === 'Neurology'
                          ? 'neurology'
                          : dept === 'Orthopedics'
                          ? 'orthopedics'
                          : 'medical_services'}
                      </span>{' '}
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* Doctor Selection & Slot Matrix */}
              <div className="pt-space-md grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="p-space-sm rounded-lg bg-surface-container-lowest flex items-center gap-space-sm border border-surface-container-high/60">
                  <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold">
                    SL
                  </div>
                  <div>
                    <div className="font-label-lg text-label-lg font-bold text-on-surface">
                      Dr. Sarah Lin
                    </div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant">
                      Cardiovascular Lead
                    </div>
                  </div>
                </div>

                {/* Available Slots Grid */}
                <div className="space-y-space-2xs">
                  <div className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                    Available Tomorrow:
                  </div>
                  <div className="grid grid-cols-3 gap-space-2xs">
                    {['09:00 AM', '10:30 AM', '03:15 PM'].map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedFastSlot(slot)}
                        className={`p-space-xs rounded font-label-sm text-label-sm transition-colors text-center cursor-pointer ${
                          selectedFastSlot === slot
                            ? 'bg-primary-container text-on-primary font-bold shadow-xs'
                            : 'bg-surface-container-lowest hover:bg-primary hover:text-on-primary text-on-surface'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-space-md pt-space-xs flex justify-between items-center border-t border-surface-container-high/40">
                <button
                  onClick={handleFastSlotConfirm}
                  className="px-space-md py-space-xs rounded-lg bg-surface-container-lowest hover:bg-surface-container text-primary font-label-md text-label-md font-bold transition-colors cursor-pointer border border-surface-container-high"
                >
                  Quick Reserve {selectedFastSlot}
                </button>
                <button
                  className="px-space-md py-space-xs rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-on-primary-fixed-variant transition-colors flex items-center gap-space-xs cursor-pointer font-bold"
                  onClick={() => setShowBookingModal(true)}
                >
                  <span>Open Full Booking Wizard</span>
                  <span className="material-symbols-outlined text-[16px]">north_east</span>
                </button>
              </div>
            </div>

            {/* Medical Reports Module */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-xs border border-surface-container-high/60" id="lab-reports-section">
              <div className="flex items-center justify-between pb-space-md">
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    My Medical Reports & Diagnostic Labs
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Encrypted clinical documents and laboratory outcomes
                  </p>
                </div>
                <span className="material-symbols-outlined text-primary text-[22px]">health_and_safety</span>
              </div>

              <div className="space-y-space-sm">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-space-md rounded-xl bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm hover:bg-surface-container transition-colors border border-surface-container-high/40"
                  >
                    <div className="flex items-start gap-space-sm">
                      <div className="w-10 h-10 rounded-lg bg-surface-container-highest text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[20px]">
                          {rep.category === 'Laboratory'
                            ? 'chips'
                            : rep.category === 'Imaging'
                            ? 'radiology'
                            : 'monitor_heart'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-space-xs flex-wrap">
                          <span className="font-label-lg text-label-lg font-bold text-on-surface">
                            {rep.title}
                          </span>
                          <span className="px-space-xs py-space-2xs rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold">
                            {rep.category}
                          </span>
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant mt-space-2xs">
                          Issued by <span className="font-medium text-on-surface">{rep.issuer}</span> • Release:{' '}
                          {rep.releaseDate}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-space-xs shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => setActiveReport(rep)}
                        className="px-space-sm py-space-xs rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md flex items-center gap-space-2xs transition-colors cursor-pointer border border-surface-container-high/60 font-medium"
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary">visibility</span>
                        <span>Secure Viewer</span>
                      </button>
                      <button
                        onClick={() => alert(`Encrypted download initiated for "${rep.title}". Verified SHA-256 Checksum.`)}
                        className="p-space-xs rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer border border-surface-container-high/60"
                        title="Download Document"
                      >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: PRESCRIPTIONS, NOTIFICATIONS, AI COPILOT (5 cols) */}
          <div className="lg:col-span-5 space-y-space-xl">
            {/* Active Prescriptions & Dosages */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-xs border border-surface-container-high/60" id="prescriptions-section">
              <div className="flex items-center justify-between pb-space-sm">
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Active Prescriptions & Regimens
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Validated with Main Hospital Dispensary
                  </p>
                </div>
                <button
                  onClick={() => handleRequestRefill('All Active Regimens')}
                  className="font-label-sm text-label-sm text-primary font-bold hover:underline cursor-pointer"
                >
                  Request Refill
                </button>
              </div>

              {refillStatus && (
                <div className="my-2 p-2 bg-tertiary-fixed text-on-tertiary-fixed rounded-lg text-label-sm font-semibold animate-fade-in">
                  {refillStatus}
                </div>
              )}

              <div className="space-y-space-md pt-space-xs">
                {prescriptions.map((med) => (
                  <div
                    key={med.id}
                    className="p-space-md rounded-xl bg-surface-container-low space-y-space-xs border border-surface-container-high/40"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-label-lg text-label-lg font-bold text-on-surface">
                        {med.name}
                      </div>
                      <span className="px-space-xs py-space-2xs rounded bg-surface-container-high text-primary font-code-sm text-code-sm font-bold">
                        {med.dosage}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {med.instructions}
                    </p>
                    <div className="flex items-center justify-between pt-space-2xs">
                      <div className="flex items-center gap-space-xs">
                        <span className="px-space-xs py-space-2xs rounded bg-surface-container font-label-sm text-label-sm text-on-surface">
                          {med.timing}
                        </span>
                        <span className="px-space-xs py-space-2xs rounded bg-surface-container font-label-sm text-label-sm text-on-surface">
                          {med.route}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRequestRefill(med.name)}
                        className={`font-label-sm text-label-sm font-bold hover:underline cursor-pointer ${
                          med.statusNote === 'Due Soon' ? 'text-on-surface-variant' : 'text-primary'
                        }`}
                      >
                        {med.refillsRemaining} Refill{med.refillsRemaining > 1 ? 's' : ''}{' '}
                        {med.statusNote ? `(${med.statusNote})` : 'Remaining'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Hospital Notifications */}
            <div className="rounded-xl bg-surface-container-lowest p-space-lg shadow-xs border border-surface-container-high/60">
              <div className="flex items-center justify-between pb-space-sm">
                <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Hospital Notifications
                </h2>
                <button
                  onClick={onMarkNotificationsRead}
                  className="font-label-sm text-label-sm text-primary font-semibold hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              </div>

              <div className="space-y-space-sm">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-space-sm p-space-sm rounded-lg hover:bg-surface-container-low transition-colors ${
                      notif.unread ? '' : 'opacity-75'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                        notif.unread ? 'bg-primary' : 'bg-transparent'
                      }`}
                    ></span>
                    <div className="space-y-space-2xs flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-label-lg text-label-lg text-on-surface ${
                            notif.unread ? 'font-bold' : 'font-semibold'
                          }`}
                        >
                          {notif.title}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          {notif.timeAgo}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agentic Patient AI Assistant Module */}
            <div className="rounded-xl bg-gradient-to-b from-surface-container-high to-surface-container-lowest p-space-lg shadow-xs border border-primary-fixed">
              <div className="flex items-center justify-between pb-space-sm">
                <div className="flex items-center gap-space-xs">
                  <div className="w-7 h-7 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px]">neurology</span>
                  </div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    CareNexus Agentic AI
                  </h2>
                </div>
                <span className="px-space-xs py-space-2xs rounded-full bg-surface-container text-primary font-label-sm text-label-sm font-bold">
                  24/7 Verified
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant pb-space-md">
                Ask queries about clinical reports, dosage guidelines, scheduling, or hospital ward protocols.
              </p>

              {/* Chat Suggestion Pills */}
              <div className="space-y-space-xs mb-space-md">
                <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                  Suggested questions:
                </span>
                <div className="flex flex-wrap gap-space-2xs">
                  {[
                    'Show my latest blood panel details',
                    'Explain Lisinopril side effects and timing',
                    'Find available slot with Dr. Sarah Lin next week',
                    'What are visiting hours for Ward 4?',
                  ].map((chip) => (
                    <button
                      key={chip}
                      className="text-left px-space-sm py-space-xs rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface font-body-sm text-body-sm transition-colors cursor-pointer border border-surface-container-high/60"
                      onClick={() => fillAIQuery(chip)}
                      type="button"
                    >
                      • {chip.length > 32 ? `${chip.substring(0, 32)}...` : chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Feed */}
              {aiHistory.length > 0 && (
                <div className="mb-space-md space-y-space-xs max-h-60 overflow-y-auto pr-1">
                  {aiHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-space-sm rounded-lg text-body-sm ${
                        item.sender === 'user'
                          ? 'bg-primary-container text-on-primary ml-4'
                          : 'bg-surface-container-low text-on-surface mr-4 border border-surface-container-high/40'
                      }`}
                    >
                      {item.sender === 'agent' && (
                        <div className="flex items-center gap-space-2xs text-primary font-label-sm text-label-sm font-bold mb-1">
                          <span className="material-symbols-outlined text-[14px]">psychology</span>
                          <span>CareNexus Clinical Intelligence Agent</span>
                        </div>
                      )}
                      <p>{item.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {isAiThinking && (
                <div className="mb-space-md p-space-md rounded-lg bg-surface-container-low text-on-surface space-y-space-xs border border-surface-container-high/40">
                  <div className="flex items-center gap-2 text-primary font-label-sm font-bold">
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>Analyzing clinical records for John Doe (MRN-90214)...</span>
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <form className="relative flex items-center" onSubmit={handleAgentChat}>
                <input
                  ref={chatInputRef}
                  className="w-full h-11 pl-space-md pr-12 rounded-xl bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary-container shadow-xs border border-surface-container-high/60"
                  id="ai-agent-input"
                  placeholder="Type medical query or request action..."
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                />
                <button
                  className="absolute right-1.5 w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:bg-on-primary-fixed-variant transition-colors cursor-pointer"
                  type="submit"
                  title="Send Query"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                </button>
              </form>

              <p className="mt-space-xs font-label-sm text-label-sm text-on-surface-variant/90 text-center flex items-center justify-center gap-space-2xs">
                <span className="material-symbols-outlined text-[12px] text-primary">verified_user</span>
                Agentic responses verified against hospital EHR documents & clinical guidelines.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Guided Appointment Booking Modal Dialog */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/40 backdrop-blur-xs p-space-md">
          <div className="w-full max-w-2xl bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] border border-surface-container-high">
            {/* Modal Header */}
            <div className="px-space-xl py-space-md bg-surface-container-low flex items-center justify-between border-b border-surface-container-high/40">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                  Book a Clinical Appointment
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Step-by-step smart clinical scheduling assistant
                </p>
              </div>
              <button
                className="p-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                onClick={() => setShowBookingModal(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body Form Steps */}
            <div className="p-space-xl space-y-space-lg overflow-y-auto">
              {/* Step 1: Department */}
              <div className="space-y-space-xs">
                <label className="font-label-lg text-label-lg font-bold text-on-surface">
                  Step 1: Select Clinical Specialty
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs">
                  {['Cardiology', 'Neurology', 'Orthopedics', 'General Care'].map((dept) => (
                    <label
                      key={dept}
                      className={`flex items-center gap-space-xs p-space-sm rounded-lg cursor-pointer border ${
                        bookDept === dept
                          ? 'bg-surface-container border-primary-container font-bold'
                          : 'bg-surface-container-low hover:bg-surface-container border-transparent'
                      }`}
                    >
                      <input
                        className="text-primary focus:ring-0 cursor-pointer accent-[#0369a1]"
                        name="dept"
                        type="radio"
                        value={dept}
                        checked={bookDept === dept}
                        onChange={() => setBookDept(dept)}
                      />
                      <span className="font-label-md text-label-md">{dept}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Step 2: Doctor Selection */}
              <div className="space-y-space-xs">
                <label className="font-label-lg text-label-lg font-bold text-on-surface">
                  Step 2: Choose Physician / Specialist
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                  <label
                    className={`flex items-center justify-between p-space-sm rounded-lg cursor-pointer border ${
                      bookDoctor === 'Dr. Sarah Lin'
                        ? 'bg-surface-container border-primary-container'
                        : 'bg-surface-container-low hover:bg-surface-container border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-space-sm">
                      <input
                        className="text-primary focus:ring-0 cursor-pointer accent-[#0369a1]"
                        name="doc"
                        type="radio"
                        value="Dr. Sarah Lin"
                        checked={bookDoctor === 'Dr. Sarah Lin'}
                        onChange={() => setBookDoctor('Dr. Sarah Lin')}
                      />
                      <div>
                        <div className="font-label-md text-label-md font-bold">Dr. Sarah Lin</div>
                        <div className="font-label-sm text-label-sm text-on-surface-variant">
                          Primary Cardiologist
                        </div>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                  </label>

                  <label
                    className={`flex items-center justify-between p-space-sm rounded-lg cursor-pointer border ${
                      bookDoctor === 'Dr. Robert Garcia'
                        ? 'bg-surface-container border-primary-container'
                        : 'bg-surface-container-low hover:bg-surface-container border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-space-sm">
                      <input
                        className="text-primary focus:ring-0 cursor-pointer accent-[#0369a1]"
                        name="doc"
                        type="radio"
                        value="Dr. Robert Garcia"
                        checked={bookDoctor === 'Dr. Robert Garcia'}
                        onChange={() => setBookDoctor('Dr. Robert Garcia')}
                      />
                      <div>
                        <div className="font-label-md text-label-md font-bold">Dr. Robert Garcia</div>
                        <div className="font-label-sm text-label-sm text-on-surface-variant">
                          Associate Specialist
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Step 3: Slots */}
              <div className="space-y-space-xs">
                <label className="font-label-lg text-label-lg font-bold text-on-surface">
                  Step 3: Select Available Slot
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-xs">
                  {['Oct 26 - 9:30 AM', 'Oct 26 - 11:00 AM', 'Oct 27 - 2:00 PM', 'Oct 27 - 4:15 PM'].map(
                    (slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setBookSlot(slot)}
                        className={`py-space-xs px-space-sm rounded-lg font-label-md text-label-md cursor-pointer transition-colors ${
                          bookSlot === slot
                            ? 'bg-primary text-on-primary font-bold shadow-xs'
                            : 'bg-surface-container-low hover:bg-primary/20 text-on-surface border border-surface-container-high/40'
                        }`}
                      >
                        {slot}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Step 4: Visit Purpose / Reason */}
              <div className="space-y-space-xs">
                <label className="font-label-lg text-label-lg font-bold text-on-surface">
                  Step 4: Visit Note for Care Team
                </label>
                <textarea
                  className="w-full p-space-sm rounded-lg bg-surface-container-low text-on-surface text-body-sm font-body-sm focus:outline-none focus:ring-1 focus:ring-primary-container resize-none border border-surface-container-high/60"
                  placeholder="Brief reason for consultation (e.g. routine BP checkup, medication adjustment)..."
                  rows={2}
                  value={bookReason}
                  onChange={(e) => setBookReason(e.target.value)}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-space-xl py-space-md bg-surface-container-low flex items-center justify-between border-t border-surface-container-high/40">
              <button
                className="px-space-md py-space-xs rounded-lg hover:bg-surface-container text-on-surface-variant font-label-lg text-label-lg cursor-pointer"
                onClick={() => setShowBookingModal(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="px-space-xl py-space-xs rounded-lg bg-primary text-on-primary hover:bg-on-primary-fixed-variant font-label-lg text-label-lg font-bold flex items-center gap-space-xs cursor-pointer shadow-sm"
                onClick={() => handleBookingSubmit()}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Confirm Booking</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secure Report Viewer Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-2xl w-full p-6 shadow-2xl border border-surface-container-high space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">verified</span>
                <div>
                  <h3 className="font-headline-sm font-bold text-on-surface">{activeReport.title}</h3>
                  <span className="text-label-sm text-on-surface-variant">
                    {activeReport.category} • Released: {activeReport.releaseDate}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveReport(null)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 font-body-sm text-body-sm text-on-surface">
              <div className="p-3 bg-surface-container-low rounded-lg space-y-1">
                <div className="font-bold text-on-surface">Attending Reviewer & Issuer:</div>
                <div className="text-secondary">{activeReport.issuer} (Authorized Clinician Clearance)</div>
              </div>

              <div className="p-3 bg-surface-container-lowest border border-surface-container-high rounded-lg space-y-2">
                <div className="font-bold text-primary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Diagnostic Findings & Clinical Interpretation</span>
                </div>
                <p className="text-on-surface leading-relaxed">{activeReport.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-label-sm">
                <div className="p-2.5 bg-surface-container-low rounded">
                  <span className="text-on-surface-variant block">Encrypted Document Size:</span>
                  <span className="font-mono font-bold text-on-surface">{activeReport.fileSize}</span>
                </div>
                <div className="p-2.5 bg-surface-container-low rounded">
                  <span className="text-on-surface-variant block">Security Clearance:</span>
                  <span className="font-semibold text-primary">Zero-Trust Verified</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-surface-container-low">
              <span className="text-[11px] font-mono text-secondary">SHA-256 Checksum: c784f9..9012</span>
              <div className="flex gap-2">
                <button
                  onClick={() => alert(`Downloaded full PDF for ${activeReport.title}.`)}
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>Export PDF</span>
                </button>
                <button
                  onClick={() => setActiveReport(null)}
                  className="px-4 py-2 bg-surface-container text-on-surface rounded-lg font-label-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay Invoice Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6 shadow-2xl border border-surface-container-high space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-low">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">credit_card</span>
                <h3 className="font-headline-sm font-bold text-on-surface">Pay Patient Balance</h3>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3 font-body-sm">
              <div className="p-3 bg-surface-container-low rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-bold text-on-surface">Cardiology Consultation Copay</div>
                  <div className="text-label-sm text-on-surface-variant">Invoice #INV-2024-90214 • Oct 25</div>
                </div>
                <div className="text-headline-md font-bold text-primary">$45.00</div>
              </div>

              <div className="space-y-2">
                <label className="block text-label-md font-bold uppercase text-on-surface-variant">
                  Payment Method
                </label>
                <div className="p-3 bg-surface-container-lowest border border-surface-container-high rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">account_balance_wallet</span>
                    <div>
                      <div className="font-medium text-on-surface">HSA / Flex Spending Card</div>
                      <div className="text-label-sm text-secondary">•••• 4242 (Exp 08/28)</div>
                    </div>
                  </div>
                  <span className="text-primary font-bold text-label-sm">Primary</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container-low">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 bg-surface-container text-on-surface rounded-lg font-label-md"
              >
                Cancel
              </button>
              <button
                onClick={handlePayInvoice}
                className="px-6 py-2 bg-primary text-on-primary rounded-lg font-label-md font-bold shadow-md cursor-pointer hover:bg-primary-container"
              >
                Authorize $45.00
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
