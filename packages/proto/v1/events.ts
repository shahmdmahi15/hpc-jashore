// @hpc/proto v1 — realtime event contract.
// Naming: {domain}.{past_tense}. Payloads are slim: { id, ...refs }.
// Clients receive the event, then GET fresh state from REST. Never put PHI
// beyond IDs in event payloads (TV + dashboards share the same bus).

export const PROTO_VERSION = 1 as const;

export const Events = {
  QueueUpdated: 'queue.updated',
  SerialCalled: 'serial.called',
  SerialCompleted: 'serial.completed',
  VisitCheckedIn: 'visit.checked_in',
  VisitCheckedOut: 'visit.checked_out',
  PatientRouted: 'patient.routed',
  SessionStarted: 'session.started',
  SessionCompleted: 'session.completed',
  PaymentPosted: 'payment.posted',
  AnnouncementPublished: 'announcement.published',
  // Phase 1 backbone events:
  PresenceUpdated: 'presence.updated',
  SettingsUpdated: 'settings.updated',
  StaffUpdated: 'staff.updated',
  ConsultationSaved: 'consultation.saved',
  PrescriptionCreated: 'prescription.created',
  BillCreated: 'bill.created',
  DrawerClosed: 'drawer.closed',
  InventoryAlert: 'inventory.alert',
} as const;

export type HpcEvent = (typeof Events)[keyof typeof Events];

export const Rooms = {
  Global: 'clinic:global',
  role: (role: string) => `role:${role}`,
  doctor: (id: string) => `doctor:${id}`,
  room: (id: string) => `room:${id}`,
  patient: (mrn: string) => `patient:${mrn}`,
} as const;
