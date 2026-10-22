import type { PunctualityStatus } from '../db/schema';

export function parseToldTimeToMinutes(toldTimeStr?: string | null): number | null {
  if (!toldTimeStr || !toldTimeStr.trim()) return null;
  const clean = toldTimeStr.trim().toUpperCase();

  // Handle format "HH:MM AM/PM" or "HH:MM"
  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3];

  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

export function computePunctuality(
  toldTimeStr?: string | null,
  checkInDate: Date = new Date(),
): { punctualityStatus: PunctualityStatus; delayMinutes: number } | null {
  const toldMinutes = parseToldTimeToMinutes(toldTimeStr);
  if (toldMinutes === null) return null;

  const currentMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
  const delayMinutes = currentMinutes - toldMinutes;

  if (delayMinutes <= 5) {
    return {
      punctualityStatus: 'on_time',
      delayMinutes,
    };
  } else if (delayMinutes <= 15) {
    return {
      punctualityStatus: 'moderate_delay',
      delayMinutes,
    };
  } else {
    return {
      punctualityStatus: 'critical_delay',
      delayMinutes,
    };
  }
}
