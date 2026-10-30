// apps/web/lib/legacy-patient.ts

export interface LegacyFileInfo {
  isLegacy: boolean;
  fileNo?: string;
}

export type PatientLike = {
  legacyId?: string | null;
  notes?: string | null;
  nameEn?: string | null;
  nameBn?: string | null;
  mrn?: string | null;
  phone?: string | null;
  address?: string | null;
};

/**
 * Checks if a patient record belongs to an existing paper-file legacy patient
 * and extracts the old paper file / legacy ID number if available.
 *
 * Checks first-class patient.legacyId first, then falls back to notes tags:
 * - [পুরাতন ফাইল: 1042]
 * - [পুরাতন ফাইল]
 * - [Legacy File: 1042]
 * - [Legacy Paper File]
 */
export function getLegacyFileInfo(input?: string | null | PatientLike): LegacyFileInfo {
  if (!input) return { isLegacy: false };

  // If input is an object with legacyId or notes
  if (typeof input === 'object') {
    if (input.legacyId && input.legacyId.trim()) {
      return { isLegacy: true, fileNo: input.legacyId.trim() };
    }
    return getLegacyFileInfo(input.notes);
  }

  const notes = input;
  if (typeof notes !== 'string') return { isLegacy: false };

  // Match Bengali tag: [পুরাতন ফাইল: XYZ] or [পুরাতন ফাইল]
  const matchBn = notes.match(/\[পুরাতন ফাইল(?::\s*([^\]]+))?\]/i);
  if (matchBn) {
    return { isLegacy: true, fileNo: matchBn[1]?.trim() || undefined };
  }

  // Match English tag: [Legacy File: XYZ] or [Paper File: XYZ]
  const matchEn = notes.match(/\[(?:Legacy File|Paper File|Legacy)(?::\s*([^\]]+))?\]/i);
  if (matchEn) {
    return { isLegacy: true, fileNo: matchEn[1]?.trim() || undefined };
  }

  // Plain text fallback
  if (
    notes.includes('পুরাতন ফাইল') ||
    notes.includes('Old Patient (Paper File)') ||
    notes.includes('[legacy_paper_file]')
  ) {
    return { isLegacy: true };
  }

  return { isLegacy: false };
}

/**
 * Universal multi-field patient matcher.
 * Evaluates search term across:
 * - Legacy ID (xxxx)
 * - Modern MRN (MRN-YYYYMMDD-XXXX)
 * - Full Name (English & Bengali)
 * - Address
 * - Phone number
 * - Notes & legacy tags
 */
export function matchesPatientSearch(
  patient: PatientLike | null | undefined,
  term?: string | null
): boolean {
  if (!term || !term.trim()) return true;
  if (!patient) return false;

  const q = term.trim().toLowerCase();

  // 1. Direct MRN & Legacy ID matching
  if (patient.mrn && patient.mrn.toLowerCase().includes(q)) return true;
  if (patient.legacyId && patient.legacyId.toLowerCase().includes(q)) return true;

  // 2. Phone matching (exact or substring)
  if (patient.phone && patient.phone.toLowerCase().includes(q)) return true;

  // 3. Name matching (En & Bn)
  if (patient.nameEn && patient.nameEn.toLowerCase().includes(q)) return true;
  if (patient.nameBn && patient.nameBn.toLowerCase().includes(q)) return true;

  // 4. Address matching
  if (patient.address && patient.address.toLowerCase().includes(q)) return true;

  // 5. Notes & legacy file tags matching
  if (patient.notes && patient.notes.toLowerCase().includes(q)) return true;
  const legacy = getLegacyFileInfo(patient);
  if (legacy.fileNo && legacy.fileNo.toLowerCase().includes(q)) return true;

  return false;
}

/**
 * Encodes legacy paper file information into the patient's notes string.
 * Strips pre-existing legacy tags to avoid duplicate tags during edits.
 */
export function formatLegacyNotes(
  isOldPatient: boolean,
  fileNo: string,
  userNotes: string,
): string {
  // Strip out any pre-existing legacy tags from userNotes first to prevent duplication
  const cleanNotes = (userNotes || '')
    .replace(/\[(?:পুরাতন ফাইল|Legacy File|Paper File|Legacy)(?::\s*[^\]]+)?\]\s*/gi, '')
    .trim();

  if (!isOldPatient) {
    return cleanNotes;
  }

  const trimmedFileNo = (fileNo || '').trim();
  const tag = trimmedFileNo ? `[পুরাতন ফাইল: ${trimmedFileNo}]` : '[পুরাতন ফাইল]';

  return cleanNotes ? `${tag} ${cleanNotes}` : tag;
}
