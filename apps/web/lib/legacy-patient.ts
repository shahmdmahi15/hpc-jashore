// apps/web/lib/legacy-patient.ts

export interface LegacyFileInfo {
  isLegacy: boolean;
  fileNo?: string;
}

/**
 * Checks if a patient record belongs to an existing paper-file legacy patient
 * and extracts the old paper file number if available.
 *
 * Supports both Bengali and English tag formats:
 * - [পুরাতন ফাইল: F-102]
 * - [পুরাতন ফাইল]
 * - [Legacy File: 402]
 * - [Legacy Paper File]
 */
export function getLegacyFileInfo(notes?: string | null): LegacyFileInfo {
  if (!notes || typeof notes !== 'string') return { isLegacy: false };

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
  if (notes.includes('পুরাতন ফাইল') || notes.includes('Old Patient (Paper File)') || notes.includes('[legacy_paper_file]')) {
    return { isLegacy: true };
  }

  return { isLegacy: false };
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
