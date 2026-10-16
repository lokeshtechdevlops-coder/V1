export type AppRole = 'auth' | 'doctor' | 'patient' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  role: 'doctor' | 'patient' | 'admin';
  title: string;
  email: string;
  department?: string;
  avatarUrl?: string;
  mrn?: string;
  npi?: string;
  badge?: string;
}

export interface Appointment {
  id: string;
  doctorName: string;
  specialistTitle: string;
  department: string;
  suite: string;
  dateStr: string;
  timeStr: string;
  status: 'Confirmed' | 'Scheduled' | 'Completed';
  room?: string;
}

export interface Prescription {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  timing: string;
  route: string;
  refillsRemaining: number;
  statusNote?: string;
}

export interface MedicalReport {
  id: string;
  title: string;
  category: 'Laboratory' | 'Imaging' | 'Cardiology';
  issuer: string;
  releaseDate: string;
  summary: string;
  fileSize: string;
  normalStatus: boolean;
}

export interface HospitalNotification {
  id: string;
  title: string;
  timeAgo: string;
  message: string;
  unread: boolean;
}

export interface PatientRecord {
  mrn: string;
  name: string;
  age: number;
  gender: string;
  dob: string;
  bed: string;
  ward: string;
  diagnosis: string;
  acuity: 'ESI-1' | 'ESI-2' | 'ESI-3' | 'ESI-4';
  acuityLabel: string;
  attending: string;
  tier: 'Tier 1: High Risk' | 'Tier 2: Monitored' | 'Tier 3: Routine';
  echoLvef?: string;
  vitals: {
    bp: string;
    hr: number;
    spo2: number;
    temp: string;
  };
}

export interface RosterPhysician {
  id: string;
  name: string;
  initials: string;
  department: string;
  roleTitle: string;
  shift: string;
  assignedPatients: number;
  badgeColor?: string;
}

export interface RbacGrant {
  id: string;
  physicianName: string;
  npi: string;
  patientMrn: string;
  patientName: string;
  department: string;
  grantType: 'Primary Attending' | 'Consult Only (48h)' | 'Emergency Override';
  expiryDate: string;
  isEmergency?: boolean;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  sha: string;
  pages: number;
  chunkInfo: string;
  category: string;
  audience: string;
  version: string;
  status: 'Active & Indexed' | 'Processing' | 'Deprecated';
  progress?: number;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  scope: string;
  resourceId: string;
  ip: string;
  outcome: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  notes: string;
}

export interface FormularyItem {
  id: string;
  name: string;
  ndc: string;
  threshold: number;
  parLevel: number;
  unitsLeft: number;
  percentage: number;
  isLow: boolean;
}
