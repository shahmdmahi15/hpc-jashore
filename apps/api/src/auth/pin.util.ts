// PIN policy (Standard, locked): exactly 4 digits, reject repeats
// (1111, 0000), ascending/descending sequences (1234, 4321).
const REPEATED = /^(\d)\1{3}$/;

function isSequential(pin: string): boolean {
  const d = pin.split('').map(Number);
  const asc = d.every((v, i) => i === 0 || v === d[i - 1] + 1);
  const desc = d.every((v, i) => i === 0 || v === d[i - 1] - 1);
  return asc || desc;
}

export function validatePinPolicy(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return 'PIN must be exactly 4 digits';
  if (REPEATED.test(pin)) return 'PIN must not repeat one digit';
  if (isSequential(pin)) return 'PIN must not be sequential';
  return null;
}
